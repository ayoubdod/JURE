# cases/views/case_viewset.py
import logging

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from cabinets.permissions import HasCasesPermission
from core.utils import NumericPagination, get_user_cabinet
from users.models import User

from ..models import Case
from ..serializers import CaseSerializer
from ..utils import batch_counts_tasks_appointments, fetch_case_related_payload
from .close_mixin import CloseCaseMixin
from .consultation_convert_mixin import ConsultationConvertMixin
from .consultation_workflow_mixin import ConsultationWorkflowMixin
from .filters import CaseFilter, CaseSearchFilter

logger = logging.getLogger(__name__)


class CaseViewSet(CloseCaseMixin, ConsultationConvertMixin, ConsultationWorkflowMixin, viewsets.ModelViewSet):
    """
    RESTful case management. Supports caseType filter and type-specific sub-fields.

    POST /api/v1/cases/ — create (caseType + case_specific_data required)
    GET /api/v1/cases/ — list (filter by caseType, status, assignedTo)
    GET /api/v1/cases/:id/ — retrieve single case with all sub-fields
    PUT/PATCH /api/v1/cases/:id/ — update any field including sub-fields
    DELETE /api/v1/cases/:id/ — delete case
    POST /api/v1/cases/:id/close/ — close matter (status=CLOSED + audit)
    """

    queryset = Case.objects.all().order_by("id")
    serializer_class = CaseSerializer
    filter_backends = [DjangoFilterBackend, CaseFilter, CaseSearchFilter]
    filterset_fields = ["status", "case_type", "assigned_to"]
    search_fields = [
        "title",
        "description",
        "reference",
        "court",
        "client__first_name",
        "client__last_name",
        "client__email",
        "assigned_to__first_name",
        "assigned_to__last_name",
        "assigned_attorneys__first_name",
        "assigned_attorneys__last_name",
    ]
    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]
    pagination_class = NumericPagination

    def get_queryset(self):
        """Scope by user's cabinet; prefetch conversion and common relations."""
        cab = get_user_cabinet(self.request.user)
        if not cab:
            return Case.objects.none()
        return (
            super()
            .get_queryset()
            .filter(cabinet=cab)
            .select_related(
                "converted_to_case",
                "converted_from_case",
                "created_by",
                "updated_by",
                "assigned_to",
                "client",
                "client__firm_client_profile",
                "parent_consultation",
            )
            .prefetch_related(
                "assigned_attorneys",
                "follow_ups",
                "follow_ups__assigned_to",
                "follow_ups__assigned_attorneys",
                "attachments",
            )
            .annotate(follow_up_count=Count("follow_ups", distinct=True))
        )

    def perform_create(self, serializer):
        """Set cabinet, assignee, and created_by; tolerate assigned_to vs assigned_to_id."""
        logger.info("Case create request from user=%s", self.request.user.id)
        user = self.request.user
        cab = get_user_cabinet(user)
        if not cab:
            logger.warning("Case create denied: user %s has no cabinet", user.id)
            raise PermissionDenied("User has no cabinet.")

        assignee_id = self.request.data.get("assigned_to_id") or self.request.data.get("assigned_to")
        if assignee_id:
            try:
                assignee = get_object_or_404(User, pk=assignee_id)
            except (ValueError, TypeError):
                assignee = user
                logger.warning(
                    "Invalid assigned_to/assigned_to_id=%s, defaulting to requester",
                    assignee_id,
                )
        else:
            assignee = user

        logger.info("Case create: cabinet=%s, assignee=%s", cab.id if cab else None, assignee.id)
        serializer.save(cabinet=cab, assigned_to=assignee, created_by=user)
        instance = serializer.instance
        if instance and instance.case_type == Case.CaseType.CONSULTATION:
            from ..activity import log_consultation_activity
            from ..email import send_consultation_confirmation

            log_consultation_activity(
                instance,
                "consultation_created",
                f"Consultation {instance.reference} created",
                actor=user,
            )
            send_consultation_confirmation(instance, actor=user)

    def perform_update(self, serializer):
        """Persist update and set updated_by."""
        user = self.request.user
        cab = get_user_cabinet(user)
        if not cab:
            raise PermissionDenied("User has no cabinet.")
        serializer.save(updated_by=user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            case_ids = [c.id for c in page]
            counts_map = batch_counts_tasks_appointments(case_ids)
            serializer = self.get_serializer(
                page,
                many=True,
                context={**self.get_serializer_context(), "counts_map": counts_map},
            )
            return self.get_paginated_response(serializer.data)
        case_list = list(queryset)
        counts_map = batch_counts_tasks_appointments([c.id for c in case_list])
        serializer = self.get_serializer(
            case_list,
            many=True,
            context={**self.get_serializer_context(), "counts_map": counts_map},
        )
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        counts_map = batch_counts_tasks_appointments([instance.id])
        try:
            related_payload = fetch_case_related_payload(instance)
        except Exception:
            logger.exception("fetch_case_related_payload failed for case_id=%s", instance.id)
            related_payload = {"tasks": [], "appointments": []}
        serializer = self.get_serializer(
            instance,
            context={
                **self.get_serializer_context(),
                "counts_map": counts_map,
                "include_related": True,
                "related_payload": related_payload,
                "schedule_conflicts": self._conflicts_for(instance) if instance.case_type == Case.CaseType.CONSULTATION else None,
            },
        )
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Case create validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        instance = serializer.instance
        extra_context = {}
        if instance and instance.case_type == Case.CaseType.CONSULTATION:
            extra_context["schedule_conflicts"] = self._conflicts_for(instance)
            extra_context["include_related"] = True
            serializer = self.get_serializer(instance, context={**self.get_serializer_context(), **extra_context})
        headers = self.get_success_headers(serializer.data)
        logger.info("Case created: id=%s", serializer.data.get("id"))
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
