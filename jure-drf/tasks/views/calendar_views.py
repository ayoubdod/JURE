from datetime import datetime, timedelta

from django.db.models import Count, Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from cabinets.permissions import HasTasksPermission
from ..models import Appointment, Task
from ..serializers import CalendarEventSerializer
from .helpers import _user_lite


class CalendarEventsView(APIView):
    """
    GET /calendar/events?start=...&end=...&types=tasks,appointments&status=...&priority=...&assigned_to=ID&case=ID
    Returns unified calendar events for FullCalendar.
    """
    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]

    def get(self, request):
        user = request.user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet

        start = request.query_params.get('start')
        end = request.query_params.get('end')
        types = request.query_params.get('types', 'tasks,appointments').split(',')
        status_filter = request.query_params.get('status')
        priority = request.query_params.get('priority')
        assigned_to = request.query_params.get('assigned_to')
        case_id = request.query_params.get('case')
        client = request.query_params.get('client')
        search = (request.query_params.get('search') or '').strip()

        dt_start = parse_datetime(start) if start else None
        dt_end = parse_datetime(end) if end else None

        results = []

        if 'tasks' in types:
            tq = Task.objects.filter(cabinet=cabinet).select_related(
                'assigned_to', 'case', 'client'
            ).prefetch_related('assignees').annotate(
                _attachment_count=Count('attachments', distinct=True)
            )
            if status_filter:
                tq = tq.filter(status=status_filter)
            if priority:
                tq = tq.filter(priority=priority)
            if assigned_to:
                tq = tq.filter(
                    Q(assigned_to_id=assigned_to) | Q(assignees__id=assigned_to)
                ).distinct()
            if case_id:
                tq = tq.filter(case_id=case_id)
            if client:
                tq = tq.filter(client_id=client)
            if search:
                tq = tq.filter(Q(title__icontains=search) | Q(description__icontains=search))
            if dt_start and dt_end:
                today = timezone.now().date()
                tq = tq.filter(
                    Q(due_date__gte=dt_start.date(), due_date__lte=(dt_end - timedelta(days=1)).date()) |
                    Q(due_date__isnull=True, created__date__gte=dt_start.date(), created__date__lte=(dt_end - timedelta(days=1)).date())
                )

            for t in tq:
                display_date = t.due_date if t.due_date else t.created.date()
                assignees = list(t.assignees.all())
                if not assignees and t.assigned_to_id:
                    assignees = [t.assigned_to]
                results.append({
                    'id': f'task-{t.id}',
                    'type': 'task',
                    'title': t.title,
                    'start': datetime.combine(display_date, datetime.min.time()),
                    'end': None,
                    'allDay': True,
                    'status': t.status,
                    'priority': t.priority,
                    'assigned_to': _user_lite(assignees[0] if assignees else t.assigned_to),
                    'assignees': [_user_lite(u) for u in assignees],
                    'attachment_count': getattr(t, '_attachment_count', 0),
                    'case_id': t.case_id,
                    'case_title': getattr(t.case, 'title', ''),
                    'client': _user_lite(t.client) if t.client_id else None,
                })

        if 'appointments' in types:
            aq = Appointment.objects.filter(cabinet=cabinet)
            if status_filter:
                aq = aq.filter(status=status_filter)
            if case_id:
                aq = aq.filter(case_id=case_id)
            if client:
                aq = aq.filter(client_id=client)
            if search:
                aq = aq.filter(
                    Q(title__icontains=search) | Q(description__icontains=search) | Q(location__icontains=search)
                )
            if assigned_to:
                aq = aq.filter(Q(created_by_id=assigned_to) | Q(attendees__id=assigned_to)).distinct()
            if dt_start and dt_end:
                aq = aq.filter(end_at__gte=dt_start, start_at__lte=dt_end)

            aq = aq.select_related('created_by', 'case', 'client', 'conversation').prefetch_related('attendees')
            for a in aq:
                conv_title = ''
                if a.conversation_id:
                    conv_title = (a.conversation.title or '').strip() or f'Conversation #{a.conversation_id}'
                results.append({
                    'id': f'appt-{a.id}',
                    'type': 'appointment',
                    'title': a.title,
                    'start': a.start_at,
                    'end': a.end_at,
                    'allDay': False,
                    'status': a.status,
                    'meeting_type': a.meeting_type,
                    'location': a.location or '',
                    'conversation_id': a.conversation_id,
                    'conversation_title': conv_title,
                    'assigned_to': _user_lite(a.created_by) if a.created_by_id else None,
                    'case_id': a.case_id,
                    'case_title': getattr(a.case, 'title', ''),
                    'client': _user_lite(a.client) if a.client_id else None,
                })

        serializer = CalendarEventSerializer(results, many=True)
        return Response(serializer.data)
