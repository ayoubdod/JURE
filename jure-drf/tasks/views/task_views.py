from django.db.models import Count, Prefetch, Q
from django.http import Http404
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.utils import NumericPagination
from cabinets.permissions import HasTasksPermission
from ..models import Task, TaskAttachment
from ..serializers import TaskAttachmentSerializer, TaskSerializer
from .helpers import _download_attachment, _safe_delete_file, _save_uploaded_files, _user_cabinet, _week_bounds


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


