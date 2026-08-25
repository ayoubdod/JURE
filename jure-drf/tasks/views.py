# backend/tasks/views.py
from datetime import datetime, timedelta
from pathlib import Path

from django.http import FileResponse, Http404
from django.utils.dateparse import parse_datetime, parse_date
from django.utils import timezone
from django.db.models import Count, Prefetch, Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import NumericPagination
from cabinets.permissions import HasTasksPermission
from .models import Appointment, AppointmentAttachment, Task, TaskAttachment
from .serializers import (
    AppointmentAttachmentSerializer,
    AppointmentSerializer,
    CalendarEventSerializer,
    TaskAttachmentSerializer,
    TaskSerializer,
)


PREVIEWABLE_SUFFIXES = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt'}


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or user.cabinet


def _week_bounds(today):
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=7)


def _user_lite(user):
    if not user:
        return None
    return {
        'id': user.id,
        'email': getattr(user, 'email', None),
        'first_name': getattr(user, 'first_name', ''),
        'last_name': getattr(user, 'last_name', ''),
        'image': getattr(user, 'image', None) and str(user.image) or None,
    }


def _save_uploaded_files(files, *, model, fk_field, parent, user):
    created = []
    for uploaded in files:
        if not uploaded:
            continue
        kwargs = {
            fk_field: parent,
            'file': uploaded,
            'original_name': getattr(uploaded, 'name', '') or '',
            'mime': getattr(uploaded, 'content_type', '') or '',
            'size': getattr(uploaded, 'size', 0) or 0,
            'uploaded_by': user,
        }
        created.append(model.objects.create(**kwargs))
    return created


def _download_attachment(request, attachment):
    if not attachment.file:
        raise Http404()
    try:
        fh = attachment.file.open('rb')
    except Exception as exc:
        raise Http404() from exc
    filename = attachment.original_name or Path(attachment.file.name).name
    inline = str(request.query_params.get('inline', '')).lower() in ('1', 'true', 'yes')
    suffix = Path(filename).suffix.lower()
    as_attachment = not (inline and suffix in PREVIEWABLE_SUFFIXES)
    response = FileResponse(fh, as_attachment=as_attachment, filename=filename)
    if attachment.mime:
        response['Content-Type'] = attachment.mime
    return response


def _safe_delete_file(file_field):
    try:
        if file_field:
            try:
                file_field.close()
            except Exception:
                pass
            file_field.delete(save=False)
    except OSError:
        # Windows may keep a lock briefly after FileResponse; DB row still removed.
        pass


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
            'assigned_to', 'case', 'client', 'created_by'
        ).prefetch_related(
            'assignees',
            Prefetch(
                'attachments',
                queryset=TaskAttachment.objects.select_related('uploaded_by'),
            ),
        )
        params = self.request.query_params
        status_filter = params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        priority = params.get('priority')
        if priority and priority != 'all':
            qs = qs.filter(priority=priority)
        assigned_to = params.get('assigned_to')
        if assigned_to and assigned_to != 'all':
            qs = qs.filter(
                Q(assigned_to_id=assigned_to) | Q(assignees__id=assigned_to)
            ).distinct()
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

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        task = self.get_object()
        if request.method == 'GET':
            qs = task.attachments.select_related('uploaded_by')
            return Response(TaskAttachmentSerializer(qs, many=True, context={'request': request}).data)
        files = request.FILES.getlist('files') or request.FILES.getlist('file')
        if not files:
            return Response({'files': 'Please attach at least one file.'}, status=status.HTTP_400_BAD_REQUEST)
        created = _save_uploaded_files(
            files, model=TaskAttachment, fk_field='task', parent=task, user=request.user
        )
        return Response(
            TaskAttachmentSerializer(created, many=True, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path=r'attachments/(?P<attachment_id>[^/.]+)')
    def destroy_attachment(self, request, pk=None, attachment_id=None):
        task = self.get_object()
        attachment = task.attachments.filter(pk=attachment_id).first()
        if not attachment:
            raise Http404()
        _safe_delete_file(attachment.file)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path=r'attachments/(?P<attachment_id>[^/.]+)/download')
    def download_attachment(self, request, pk=None, attachment_id=None):
        task = self.get_object()
        attachment = task.attachments.filter(pk=attachment_id).first()
        if not attachment:
            raise Http404()
        return _download_attachment(request, attachment)


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
            .select_related('created_by', 'case', 'client', 'conversation')
            .prefetch_related(
                'attendees',
                Prefetch(
                    'attachments',
                    queryset=AppointmentAttachment.objects.select_related('uploaded_by'),
                ),
            )
        )
        params = self.request.query_params
        status_filter = params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        case_id = params.get('case')
        if case_id and case_id != 'all':
            qs = qs.filter(case_id=case_id)
        client = params.get('client')
        if client and client != 'all':
            qs = qs.filter(client_id=client)
        assigned_to = params.get('assigned_to') or params.get('created_by')
        if assigned_to and assigned_to != 'all':
            qs = qs.filter(Q(created_by_id=assigned_to) | Q(attendees__id=assigned_to)).distinct()
        meeting_type = params.get('meeting_type')
        if meeting_type and meeting_type != 'all':
            qs = qs.filter(meeting_type=meeting_type)

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

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        appointment = self.get_object()
        if request.method == 'GET':
            qs = appointment.attachments.select_related('uploaded_by')
            return Response(
                AppointmentAttachmentSerializer(qs, many=True, context={'request': request}).data
            )
        files = request.FILES.getlist('files') or request.FILES.getlist('file')
        if not files:
            return Response({'files': 'Please attach at least one file.'}, status=status.HTTP_400_BAD_REQUEST)
        created = _save_uploaded_files(
            files,
            model=AppointmentAttachment,
            fk_field='appointment',
            parent=appointment,
            user=request.user,
        )
        return Response(
            AppointmentAttachmentSerializer(created, many=True, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path=r'attachments/(?P<attachment_id>[^/.]+)')
    def destroy_attachment(self, request, pk=None, attachment_id=None):
        appointment = self.get_object()
        attachment = appointment.attachments.filter(pk=attachment_id).first()
        if not attachment:
            raise Http404()
        _safe_delete_file(attachment.file)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path=r'attachments/(?P<attachment_id>[^/.]+)/download')
    def download_attachment(self, request, pk=None, attachment_id=None):
        appointment = self.get_object()
        attachment = appointment.attachments.filter(pk=attachment_id).first()
        if not attachment:
            raise Http404()
        return _download_attachment(request, attachment)


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
