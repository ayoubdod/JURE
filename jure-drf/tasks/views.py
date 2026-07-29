# backend/tasks/views.py
from datetime import datetime, timedelta
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import NumericPagination
from cabinets.permissions import HasTasksPermission
from .models import Task, Appointment
from .serializers import TaskSerializer, AppointmentSerializer, CalendarEventSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]
    pagination_class = NumericPagination

    def get_queryset(self):
        user = self.request.user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        return Task.objects.filter(cabinet=cabinet).select_related('assigned_to', 'case')


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]
    pagination_class = NumericPagination

    def get_queryset(self):
        user = self.request.user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        return Appointment.objects.filter(cabinet=cabinet).select_related('created_by', 'case').prefetch_related('attendees')


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
        status = request.query_params.get('status')
        priority = request.query_params.get('priority')
        assigned_to = request.query_params.get('assigned_to')
        case_id = request.query_params.get('case')
        client = request.query_params.get('client')

        # date filtering
        # FullCalendar sends ISO strings; for tasks (date-only) we map to that range
        dt_start = parse_datetime(start) if start else None
        dt_end = parse_datetime(end) if end else None

        results = []

        # Tasks (as all-day events on due_date)
        if 'tasks' in types:
            tq = Task.objects.filter(cabinet=cabinet).select_related('assigned_to', 'case', 'client')
            if status:
                tq = tq.filter(status=status)
            if priority:
                tq = tq.filter(priority=priority)
            if assigned_to:
                tq = tq.filter(assigned_to_id=assigned_to)
            if case_id:
                tq = tq.filter(case_id=case_id)
            if client:
                tq = tq.filter(client_id=client)
            if dt_start and dt_end:
                # Include tasks with due_date in range OR tasks without due_date (show them on today)
                today = timezone.now().date()
                tq = tq.filter(
                    Q(due_date__gte=dt_start.date(), due_date__lte=(dt_end - timedelta(days=1)).date()) |
                    Q(due_date__isnull=True, created__date__gte=dt_start.date(), created__date__lte=(dt_end - timedelta(days=1)).date())
                )

            for t in tq:
                # Use due_date if available, otherwise use created date
                display_date = t.due_date if t.due_date else t.created.date()
                results.append({
                    'id': f'task-{t.id}',
                    'type': 'task',
                    'title': t.title,
                    'start': datetime.combine(display_date, datetime.min.time()),
                    'end': None,
                    'allDay': True,
                    'status': t.status,
                    'priority': t.priority,
                    'assigned_to': {
                        'id': t.assigned_to_id,
                        'email': getattr(t.assigned_to, 'email', None),
                        'first_name': getattr(t.assigned_to, 'first_name', ''),
                        'last_name': getattr(t.assigned_to, 'last_name', ''),
                    } if t.assigned_to_id else None,
                    'case_id': t.case_id,
                    'case_title': getattr(t.case, 'title', ''),
                    'client': {
                        'id': t.client_id,
                        'email': getattr(t.client, 'email', None),
                        'first_name': getattr(t.client, 'first_name', ''),
                        'last_name': getattr(t.client, 'last_name', ''),
                    } if t.client_id else None,
                })

        # Appointments (with time)
        if 'appointments' in types:
            aq = Appointment.objects.filter(cabinet=cabinet)
            if status:
                aq = aq.filter(status=status)
            if case_id:
                aq = aq.filter(case_id=case_id)
            if client:
                aq = aq.filter(client__icontains=client)
            if assigned_to:
                aq = aq.filter(Q(created_by_id=assigned_to) | Q(attendees__id=assigned_to))
            if dt_start and dt_end:
                aq = aq.filter(end_at__gte=dt_start, start_at__lte=dt_end)

            aq = aq.select_related('created_by', 'case').prefetch_related('attendees')
            for a in aq:
                results.append({
                    'id': f'appt-{a.id}',
                    'type': 'appointment',
                    'title': a.title,
                    'start': a.start_at,
                    'end': a.end_at,
                    'allDay': False,
                    'status': a.status,
                    'assigned_to': {
                        'id': a.created_by_id,
                        'email': getattr(a.created_by, 'email', None),
                        'first_name': getattr(a.created_by, 'first_name', ''),
                        'last_name': getattr(a.created_by, 'last_name', ''),
                    } if a.created_by_id else None,
                    'case_id': a.case_id,
                    'case_title': getattr(a.case, 'title', ''),
                    'client': {
                        'id': a.client_id,
                        'email': getattr(a.client, 'email', None),
                        'first_name': getattr(a.client, 'first_name', ''),
                        'last_name': getattr(a.client, 'last_name', ''),
                    } if a.client_id else None,
                })

        serializer = CalendarEventSerializer(results, many=True)
        return Response(serializer.data)
