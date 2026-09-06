from django.db.models import Count, Prefetch, Q
from django.http import Http404
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.utils import NumericPagination
from cabinets.permissions import HasTasksPermission
from ..models import Appointment, AppointmentAttachment
from ..serializers import AppointmentAttachmentSerializer, AppointmentSerializer
from .helpers import _download_attachment, _safe_delete_file, _save_uploaded_files, _user_cabinet, _week_bounds


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


