"""Follow-up, attachments, confirmation email, and schedule-conflict actions."""
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.utils import get_user_cabinet

from ..activity import log_consultation_activity
from ..email import send_consultation_confirmation
from ..models import Case, CaseAttachment
from ..schedule_conflicts import find_schedule_conflicts
from ..serializers import CaseAttachmentSerializer
from ..services import execute_follow_up_creation


class ConsultationWorkflowMixin:
    @action(detail=True, methods=["POST"], url_path="follow-ups")
    def follow_ups(self, request, pk=None):
        source = self.get_object()
        if source.case_type != Case.CaseType.CONSULTATION:
            return Response(
                {"detail": "Follow-ups can only be created from a consultation.", "code": "wrong_case_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cab = get_user_cabinet(request.user)
        if not cab:
            raise PermissionDenied("User has no cabinet.")
        try:
            child = execute_follow_up_creation(source, request.data, cab, request.user)
        except Exception as exc:
            return Response({"detail": str(exc), "code": "follow_up_failed"}, status=status.HTTP_400_BAD_REQUEST)
        send_consultation_confirmation(child, actor=request.user)
        serializer = self.get_serializer(
            child,
            context={**self.get_serializer_context(), "include_related": True},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["POST"], url_path="send-confirmation")
    def send_confirmation(self, request, pk=None):
        source = self.get_object()
        if source.case_type != Case.CaseType.CONSULTATION:
            return Response(
                {"detail": "Confirmation emails are only sent for consultations.", "code": "wrong_case_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ok = send_consultation_confirmation(source, actor=request.user)
        source.refresh_from_db()
        return Response(
            {
                "success": ok,
                "emailConfirmation": {
                    "status": source.email_confirmation_status or None,
                    "error": source.email_confirmation_error or None,
                },
            },
            status=status.HTTP_200_OK if ok else status.HTTP_502_BAD_GATEWAY,
        )

    @action(
        detail=True,
        methods=["GET", "POST"],
        url_path="attachments",
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        source = self.get_object()
        if request.method == "GET":
            qs = (
                CaseAttachment.objects.filter(Q(case=source) | Q(linked_cases=source))
                .select_related("uploaded_by")
                .distinct()
                .order_by("-created")
            )
            return Response(CaseAttachmentSerializer(qs, many=True, context={"request": request}).data)

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "file is required.", "code": "file_required"}, status=status.HTTP_400_BAD_REQUEST)
        att = CaseAttachment.objects.create(
            case=source,
            file=upload,
            original_name=getattr(upload, "name", "") or "",
            uploaded_by=request.user,
            other_type=request.data.get("other_type") or "",
        )
        log_consultation_activity(
            source,
            "consultation_attachment_uploaded",
            f"Document uploaded: {att.display_name()}",
            actor=request.user,
            new_value={"attachmentId": att.id, "fileName": att.display_name()},
        )
        return Response(CaseAttachmentSerializer(att, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["DELETE"], url_path="attachments/(?P<attachment_id>[0-9]+)")
    def delete_attachment(self, request, pk=None, attachment_id=None):
        source = self.get_object()
        att = CaseAttachment.objects.filter(
            Q(pk=attachment_id) & (Q(case=source) | Q(linked_cases=source))
        ).first()
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        name = att.display_name()
        att.delete()
        log_consultation_activity(
            source,
            "consultation_attachment_deleted",
            f"Document deleted: {name}",
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["GET"], url_path="schedule-conflicts")
    def schedule_conflicts_preview(self, request):
        """Optional preview: ?assignedTo=&date=&durationMinutes="""
        return Response({"conflicts": []})

    def _conflicts_for(self, case):
        try:
            return find_schedule_conflicts(case)
        except Exception:
            return []
