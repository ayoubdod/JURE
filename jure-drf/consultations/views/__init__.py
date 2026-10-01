from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import parsers, permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView

from cases.models import Case, CaseAttachment
from consultations.models import ConsultationAttachment, ConsultationRequest
from consultations.permissions import (
    CanManageConsultationRequests,
    IsPortalClient,
    is_cabinet_staff,
    is_portal_client,
)
from consultations.serializers import (
    AssignLawyerSerializer,
    CommentCreateSerializer,
    ConsultationAttachmentSerializer,
    ConsultationCommentSerializer,
    ConsultationRequestCreateSerializer,
    ConsultationRequestListSerializer,
    ConsultationRequestSerializer,
    DeclineSerializer,
    StatusChangeSerializer,
)
from consultations.services.workflow import (
    add_comment,
    assign_lawyer,
    change_status,
    confirm_consultation,
    create_consultation_request,
    decline_consultation,
)
from core.utils import get_user_cabinet
from consultations.activity import log_consultation_request_activity
from consultations.models import ConsultationEvent

User = get_user_model()


def _validation_error(exc: DjangoValidationError):
    if hasattr(exc, "message_dict"):
        raise ValidationError(exc.message_dict)
    if hasattr(exc, "messages"):
        raise ValidationError(exc.messages)
    raise ValidationError(str(exc))


class ConsultationRequestViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsPortalClient()]
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        if self.action in ("comments", "attachments"):
            return [permissions.IsAuthenticated()]
        # Staff mutations
        return [permissions.IsAuthenticated(), CanManageConsultationRequests()]

    def get_queryset(self):
        user = self.request.user
        qs = ConsultationRequest.objects.select_related(
            "client",
            "assigned_lawyer",
            "related_case",
            "cabinet",
            "conversation",
        ).prefetch_related("comments__author", "events__actor", "attachments__uploaded_by")

        if is_portal_client(user):
            return qs.filter(client=user, cabinet_id=user.cabinet_id)

        cabinet = get_user_cabinet(user)
        if not cabinet:
            return qs.none()
        qs = qs.filter(cabinet=cabinet)

        params = self.request.query_params
        if status_filter := params.get("status"):
            qs = qs.filter(status=status_filter)
        if lawyer := params.get("lawyer") or params.get("assigned_lawyer"):
            qs = qs.filter(assigned_lawyer_id=lawyer)
        if legal_area := params.get("legal_area") or params.get("legalArea"):
            qs = qs.filter(legal_area=legal_area)
        if client := params.get("client"):
            qs = qs.filter(client_id=client)
        if date_from := params.get("date_from") or params.get("dateFrom"):
            qs = qs.filter(created__date__gte=date_from)
        if date_to := params.get("date_to") or params.get("dateTo"):
            qs = qs.filter(created__date__lte=date_to)
        if search := params.get("search"):
            qs = qs.filter(subject__icontains=search) | qs.filter(
                reference__icontains=search
            ) | qs.filter(client__email__icontains=search)
        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return ConsultationRequestCreateSerializer
        if self.action == "list":
            return ConsultationRequestListSerializer
        return ConsultationRequestSerializer

    def create(self, request, *args, **kwargs):
        ser = ConsultationRequestCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            raise PermissionDenied("No cabinet associated with this account.")

        related_case = None
        related_id = data.get("related_case_id")
        if related_id:
            related_case = get_object_or_404(
                Case, pk=related_id, client=request.user, cabinet=cabinet
            )

        try:
            consultation = create_consultation_request(
                client=request.user,
                cabinet=cabinet,
                subject=data["subject"],
                legal_area=data["legal_area"],
                description=data["description"],
                preferred_format=data["preferred_format"],
                preferred_datetime=data.get("preferred_datetime") or "",
                related_case=related_case,
            )
        except DjangoValidationError as exc:
            _validation_error(exc)

        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        """Staff may update priority (and optionally preferred fields). Status via actions."""
        consultation = self.get_object()
        if not is_cabinet_staff(request.user):
            raise PermissionDenied()
        priority = request.data.get("priority")
        if priority:
            if priority not in ConsultationRequest.Priority.values:
                raise ValidationError({"priority": "Invalid priority."})
            consultation.priority = priority
            consultation.save(update_fields=["priority", "modified"])
        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        consultation = self.get_object()
        ser = AssignLawyerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lawyer = get_object_or_404(User, pk=ser.validated_data["lawyer_id"])
        try:
            consultation = assign_lawyer(consultation, lawyer, actor=request.user)
        except DjangoValidationError as exc:
            _validation_error(exc)
        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        consultation = self.get_object()
        try:
            consultation = confirm_consultation(consultation, actor=request.user)
        except DjangoValidationError as exc:
            _validation_error(exc)
        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        consultation = self.get_object()
        ser = DeclineSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            consultation = decline_consultation(
                consultation,
                actor=request.user,
                reason=ser.validated_data.get("reason") or "",
            )
        except DjangoValidationError as exc:
            _validation_error(exc)
        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        consultation = self.get_object()
        ser = StatusChangeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            consultation = change_status(
                consultation,
                ser.validated_data["status"],
                actor=request.user,
                reason=ser.validated_data.get("reason") or "",
            )
        except DjangoValidationError as exc:
            _validation_error(exc)
        return response.Response(
            ConsultationRequestSerializer(consultation, context={"request": request}).data
        )

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        consultation = self.get_object()
        if request.method == "GET":
            qs = consultation.comments.select_related("author").all()
            if is_portal_client(request.user):
                qs = qs.filter(visibility="CLIENT")
            return response.Response(
                ConsultationCommentSerializer(qs, many=True).data
            )
        ser = CommentCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        try:
            comment = add_comment(
                consultation,
                author=request.user,
                content=ser.validated_data["content"],
                visibility=ser.validated_data["visibility"],
            )
        except DjangoValidationError as exc:
            _validation_error(exc)
        return response.Response(
            ConsultationCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "post"],
        parser_classes=[parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser],
    )
    def attachments(self, request, pk=None):
        consultation = self.get_object()
        if request.method == "GET":
            qs = consultation.attachments.select_related("uploaded_by").all()
            return response.Response(
                ConsultationAttachmentSerializer(
                    qs, many=True, context={"request": request}
                ).data
            )
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": "This field is required."})
        att = ConsultationAttachment.objects.create(
            consultation=consultation,
            file=upload,
            original_name=getattr(upload, "name", "") or "",
            uploaded_by=request.user,
        )
        ConsultationEvent.objects.create(
            consultation=consultation,
            event_type=ConsultationEvent.EventType.DOCUMENT_UPLOADED,
            actor=request.user,
            metadata={"attachment_id": att.id, "name": att.display_name()},
            client_visible=True,
        )
        log_consultation_request_activity(
            consultation,
            "consultation_document_uploaded",
            f"Document uploaded: {att.display_name()}",
            actor=request.user,
            new_value={"attachment_id": att.id},
        )
        return response.Response(
            ConsultationAttachmentSerializer(att, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PortalDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPortalClient]

    def get(self, request):
        user = request.user
        cabinet = get_user_cabinet(user)
        cases_qs = Case.objects.filter(client=user)
        if cabinet:
            cases_qs = cases_qs.filter(cabinet=cabinet)
        active_cases = cases_qs.exclude(
            status__in=[Case.CaseStatus.CLOSED, Case.CaseStatus.ARCHIVED, Case.CaseStatus.CANCELLED]
        )
        requests_qs = ConsultationRequest.objects.filter(client=user)
        pending = requests_qs.exclude(
            status__in=[
                ConsultationRequest.Status.COMPLETED,
                ConsultationRequest.Status.DECLINED,
            ]
        )
        upcoming = requests_qs.filter(
            status__in=[
                ConsultationRequest.Status.CONFIRMED,
                ConsultationRequest.Status.ASSIGNED,
            ]
        ).order_by("-confirmed_at", "-created")[:5]

        from chat.models import ConversationMembership, Message

        memberships = ConversationMembership.objects.filter(
            user=user, is_deleted=False, archived=False
        ).values_list("conversation_id", flat=True)
        unread = (
            Message.objects.filter(conversation_id__in=memberships, is_deleted=False)
            .exclude(sender=user)
            .exclude(read_by=user)
            .count()
        )

        recent_cases = active_cases.order_by("-modified")[:5]
        return response.Response(
            {
                "clientName": user.get_full_name() or user.email,
                "activeCasesCount": active_cases.count(),
                "pendingConsultationsCount": pending.count(),
                "unreadMessagesCount": unread,
                "upcomingConsultations": ConsultationRequestListSerializer(
                    upcoming, many=True
                ).data,
                "recentCases": [
                    {
                        "id": c.id,
                        "title": c.title,
                        "reference": c.reference,
                        "status": c.status,
                        "caseType": c.case_type,
                        "updatedAt": c.modified,
                        "assignedLawyer": (
                            (c.assigned_to.get_full_name() or c.assigned_to.email)
                            if c.assigned_to
                            else None
                        ),
                    }
                    for c in recent_cases.select_related("assigned_to")
                ],
                "pendingConsultations": ConsultationRequestListSerializer(
                    pending.order_by("-created")[:5], many=True
                ).data,
            }
        )


class PortalCaseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsPortalClient]

    def get_queryset(self):
        user = self.request.user
        qs = Case.objects.filter(client=user).select_related(
            "assigned_to", "cabinet", "client"
        )
        cabinet = get_user_cabinet(user)
        if cabinet:
            qs = qs.filter(cabinet=cabinet)
        return qs

    def list(self, request, *args, **kwargs):
        data = []
        for c in self.get_queryset().order_by("-modified"):
            data.append(self._serialize_case(c, detail=False))
        return response.Response(data)

    def retrieve(self, request, *args, **kwargs):
        case = self.get_object()
        return response.Response(self._serialize_case(case, detail=True))

    def _serialize_case(self, case: Case, *, detail: bool):
        from dashboard.models import ActivityLog

        payload = {
            "id": case.id,
            "title": case.title,
            "reference": case.reference,
            "caseType": case.case_type,
            "status": case.status,
            "category": case.category,
            "description": case.description if detail else None,
            "summary": case.summary,
            "openedAt": case.created,
            "updatedAt": case.modified,
            "lawFirm": case.cabinet.trade_name if case.cabinet else None,
            "assignedLawyer": (
                {
                    "id": case.assigned_to.id,
                    "fullName": case.assigned_to.get_full_name() or case.assigned_to.email,
                    "email": case.assigned_to.email,
                }
                if case.assigned_to
                else None
            ),
        }
        if not detail:
            return payload

        attachments = (
            CaseAttachment.objects.filter(case=case, client_visible=True)
            .select_related("uploaded_by")
            .order_by("-created")
        )
        request = self.request
        docs = []
        for att in attachments:
            url = att.file.url if att.file else None
            docs.append(
                {
                    "id": att.id,
                    "name": att.display_name(),
                    "type": att.other_type or "",
                    "date": att.created,
                    "uploadedBy": (
                        att.uploaded_by.get_full_name() or att.uploaded_by.email
                        if att.uploaded_by
                        else ""
                    ),
                    "url": request.build_absolute_uri(url) if request and url else url,
                }
            )

        timeline = []
        timeline.append(
            {
                "id": f"created-{case.id}",
                "kind": "case_created",
                "message": "Case opened",
                "created": case.created,
            }
        )
        if case.cabinet_id:
            logs = (
                ActivityLog.objects.filter(
                    cabinet_id=case.cabinet_id,
                    entity_id=str(case.id),
                    entity_type__in=["case", "consultation", "case_client_update"],
                )
                .order_by("created")[:50]
            )
            for row in logs:
                # Skip internal-looking kinds if needed; for MVP show case_client_update + status
                if row.entity_type == "case_client_update" or row.kind in (
                    "case_status_updated",
                    "case_updated",
                    "client_update_published",
                ):
                    timeline.append(
                        {
                            "id": row.id,
                            "kind": row.kind,
                            "message": row.message,
                            "created": row.created,
                        }
                    )

        from cases.models import CaseClientUpdate

        updates = CaseClientUpdate.objects.filter(case=case).order_by("-created")[:20]
        payload["documents"] = docs
        payload["timeline"] = timeline
        payload["updates"] = [
            {
                "id": u.id,
                "content": u.content,
                "authorName": (
                    u.author.get_full_name() or u.author.email if u.author else ""
                ),
                "created": u.created,
            }
            for u in updates.select_related("author")
        ]
        payload["requiredActions"] = []  # MVP placeholder
        return payload
