# backend/tasks/views.py
from datetime import datetime, timedelta
from django.utils.dateparse import parse_datetime, parse_date
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import NumericPagination
from cabinets.permissions import HasTasksPermission
from .models import Task, Appointment
from .serializers import TaskSerializer, AppointmentSerializer, CalendarEventSerializer


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or user.cabinet


def _week_bounds(today):
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=7)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]
    pagination_class = NumericPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'status', 'created', 'title']
    ordering = ['due_date', 'id']

    def get_queryset(self):
        cabinet = _user_cabinet(self.request.user)
        qs = Task.objects.filter(cabinet=cabinet).select_related(
            'assigned_to', 'case', 'client'
        )
        params = self.request.query_params
        status = params.get('status')
        if status and status != 'all':
            qs = qs.filter(status=status)
        priority = params.get('priority')
        if priority and priority != 'all':
            qs = qs.filter(priority=priority)
        assigned_to = params.get('assigned_to')
        if assigned_to and assigned_to != 'all':
            qs = qs.filter(assigned_to_id=assigned_to)
        case_id = params.get('case')
        if case_id and case_id != 'all':
            qs = qs.filter(case_id=case_id)
        client = params.get('client')
        if client and client != 'all':
            qs = qs.filter(client_id=client)

        today = timezone.localdate()
        due = (params.get('due') or '').lower()
        overdue_flag = str(params.get('overdue', '')).lower() in ('1', 'true', 'yes')
        if due == 'overdue' or overdue_flag:
            qs = qs.filter(due_date__lt=today).exclude(status__in=['done', 'cancelled'])
        elif due == 'today':
            qs = qs.filter(due_date=today)
        elif due == 'week':
            start, end = _week_bounds(today)
            qs = qs.filter(due_date__gte=start, due_date__lt=end)
        elif due == 'month':
            qs = qs.filter(due_date__year=today.year, due_date__month=today.month)
        elif due == 'none':
            qs = qs.filter(due_date__isnull=True)

        due_from = params.get('due_date_from')
        if due_from:
            parsed = parse_date(due_from)
            if parsed:
                qs = qs.filter(due_date__gte=parsed)
        due_to = params.get('due_date_to')
        if due_to:
            parsed = parse_date(due_to)
            if parsed:
                qs = qs.filter(due_date__lte=parsed)
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        cabinet = _user_cabinet(request.user)
        qs = Task.objects.filter(cabinet=cabinet)
        today = timezone.localdate()
        data = qs.aggregate(
            total=Count('id'),
            todo=Count('id', filter=Q(status='todo')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            done=Count('id', filter=Q(status='done')),
            overdue=Count(
                'id',
                filter=Q(due_date__lt=today) & ~Q(status__in=['done', 'cancelled']),
            ),
        )
        return Response(data)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]
    pagination_class = NumericPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_at', 'end_at', 'status', 'created', 'title']
    ordering = ['start_at', 'id']

    def get_queryset(self):
        cabinet = _user_cabinet(self.request.user)
        qs = (
            Appointment.objects.filter(cabinet=cabinet)
            .select_related('created_by', 'case', 'client')
            .prefetch_related('attendees')
        )
        params = self.request.query_params
        status = params.get('status')
        if status and status != 'all':
            qs = qs.filter(status=status)
        case_id = params.get('case')
        if case_id and case_id != 'all':
            qs = qs.filter(case_id=case_id)
        client = params.get('client')
        if client and client != 'all':
            qs = qs.filter(client_id=client)
        assigned_to = params.get('assigned_to') or params.get('created_by')
        if assigned_to and assigned_to != 'all':
            qs = qs.filter(Q(created_by_id=assigned_to) | Q(attendees__id=assigned_to)).distinct()

        today = timezone.localdate()
        now = timezone.now()
        period = (params.get('period') or '').lower()
        if period == 'today':
            qs = qs.filter(start_at__date=today)
        elif period == 'week':
            start, end = _week_bounds(today)
            qs = qs.filter(start_at__date__gte=start, start_at__date__lt=end)
        elif period == 'month':
            qs = qs.filter(start_at__year=today.year, start_at__month=today.month)
        elif period == 'upcoming':
            qs = qs.filter(start_at__gte=now)

        start_from = params.get('start_from')
        if start_from:
            parsed = parse_datetime(start_from) or parse_date(start_from)
            if parsed:
                qs = qs.filter(start_at__gte=parsed)
        start_to = params.get('start_to')
        if start_to:
            parsed = parse_datetime(start_to) or parse_date(start_to)
            if parsed:
                qs = qs.filter(start_at__lte=parsed)
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        cabinet = _user_cabinet(request.user)
        qs = Appointment.objects.filter(cabinet=cabinet)
        today = timezone.localdate()
        now = timezone.now()
        data = qs.aggregate(
            total=Count('id'),
            today=Count('id', filter=Q(start_at__date=today)),
            upcoming=Count('id', filter=Q(start_at__gte=now) & Q(status='scheduled')),
            completed=Count('id', filter=Q(status='done')),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )
        return Response(data)


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
        search = (request.query_params.get('search') or '').strip()

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
            if search:
                tq = tq.filter(Q(title__icontains=search) | Q(description__icontains=search))
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
                aq = aq.filter(client_id=client)
            if search:
                aq = aq.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(location__icontains=search))
            if assigned_to:
                aq = aq.filter(Q(created_by_id=assigned_to) | Q(attendees__id=assigned_to)).distinct()
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
