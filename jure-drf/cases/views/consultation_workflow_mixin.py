"""Follow-up, attachments, confirmation email, and schedule-conflict actions."""
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.downloads import serve_file_field
from core.uploads import validate_safe_upload_extension
from core.utils import get_user_cabinet

from ..activity import log_consultation_activity
from ..email import send_consultation_confirmation
from ..models import Case, CaseAttachment, CaseAttachmentIntelligence, CaseAttachmentPage
from ..schedule_conflicts import find_schedule_conflicts
from ..serializers import (
    CaseAttachmentIntelligenceSerializer,
    CaseAttachmentPageSerializer,
    CaseAttachmentSerializer,
)
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
            raise PermissionDenied(_("User has no cabinet."))
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
        try:
            validate_safe_upload_extension(upload)
        except DjangoValidationError as exc:
            return Response({"file": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        cabinet = getattr(source, "cabinet", None)
        from django.db import transaction
        with transaction.atomic():
            if cabinet is not None:
                from subscriptions.services.entitlements import assert_storage
                assert_storage(cabinet, int(getattr(upload, "size", 0) or 0))
            att = CaseAttachment.objects.create(
                case=source,
                file=upload,
                original_name=getattr(upload, "name", "") or "",
                uploaded_by=request.user,
                other_type=request.data.get("other_type") or "",
            )
        # Phase 2: enqueue server-side OCR without blocking the upload response.
        try:
            from cases.attachment_intelligence import enqueue_attachment_intelligence

            enqueue_attachment_intelligence(att)
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Failed to enqueue attachment intelligence attachment_id=%s",
                att.pk,
            )
        log_consultation_activity(
            source,
            "consultation_attachment_uploaded",
            f"Document uploaded: {att.display_name()}",
            actor=request.user,
            new_value={"attachmentId": att.id, "fileName": att.display_name()},
        )
        return Response(CaseAttachmentSerializer(att, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["GET"], url_path="attachments/(?P<attachment_id>[0-9]+)/download")
    def download_attachment(self, request, pk=None, attachment_id=None):
        source = self.get_object()
        att = CaseAttachment.objects.filter(
            Q(pk=attachment_id) & (Q(case=source) | Q(linked_cases=source))
        ).first()
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        return serve_file_field(
            request,
            att.file,
            filename=att.display_name(),
            content_type=getattr(att.file, "content_type", None),
        )

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

    @action(
        detail=True,
        methods=["PATCH"],
        url_path="attachments/(?P<attachment_id>[0-9]+)",
    )
    def patch_attachment(self, request, pk=None, attachment_id=None):
        """Update disclosure tag (other_type) on a case attachment — P2 evidence."""
        source = self.get_object()
        att = CaseAttachment.objects.filter(
            Q(pk=attachment_id) & (Q(case=source) | Q(linked_cases=source))
        ).first()
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        if "other_type" not in request.data:
            return Response(
                {"detail": "other_type is required.", "code": "other_type_required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raw = request.data.get("other_type")
        att.other_type = (str(raw).strip() if raw is not None else "") or ""
        att.save(update_fields=["other_type", "modified"])
        return Response(CaseAttachmentSerializer(att, context={"request": request}).data)

    def _cabinet_scoped_attachment(self, source, attachment_id):
        """Resolve attachment only if it belongs to this case (cabinet isolation via get_object)."""
        return CaseAttachment.objects.filter(
            Q(pk=attachment_id) & (Q(case=source) | Q(linked_cases=source))
        ).select_related("intelligence").first()

    @action(
        detail=True,
        methods=["GET"],
        url_path="attachments/(?P<attachment_id>[0-9]+)/intelligence",
    )
    def attachment_intelligence(self, request, pk=None, attachment_id=None):
        """OCR / extraction status for a case attachment (Phase 2)."""
        source = self.get_object()
        att = self._cabinet_scoped_attachment(source, attachment_id)
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            intel = att.intelligence
        except CaseAttachmentIntelligence.DoesNotExist:
            from cases.attachment_intelligence import enqueue_attachment_intelligence

            intel = enqueue_attachment_intelligence(att)
        return Response(
            CaseAttachmentIntelligenceSerializer(intel, context={"request": request}).data
        )

    @action(
        detail=True,
        methods=["POST"],
        url_path="attachments/(?P<attachment_id>[0-9]+)/intelligence/retry",
    )
    def retry_attachment_intelligence(self, request, pk=None, attachment_id=None):
        """Safely retry a failed / required OCR/extraction job for this attachment."""
        source = self.get_object()
        att = self._cabinet_scoped_attachment(source, attachment_id)
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        from cases.attachment_intelligence import retry_attachment_intelligence
        from cases.attachment_intelligence.errors import AttachmentIntelligenceError

        try:
            intel = retry_attachment_intelligence(att)
        except AttachmentIntelligenceError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            CaseAttachmentIntelligenceSerializer(intel, context={"request": request}).data
        )

    @action(
        detail=True,
        methods=["POST"],
        url_path="attachments/(?P<attachment_id>[0-9]+)/intelligence/reprocess",
    )
    def reprocess_attachment_intelligence(self, request, pk=None, attachment_id=None):
        """Force re-OCR/re-extraction; clears obsolete page rows. Blocks concurrent runs."""
        source = self.get_object()
        att = self._cabinet_scoped_attachment(source, attachment_id)
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        from cases.attachment_intelligence import reprocess_attachment_intelligence
        from cases.attachment_intelligence.errors import AttachmentIntelligenceError

        try:
            intel = reprocess_attachment_intelligence(att, force=True)
        except AttachmentIntelligenceError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            CaseAttachmentIntelligenceSerializer(intel, context={"request": request}).data
        )

    @action(
        detail=True,
        methods=["GET"],
        url_path="attachments/(?P<attachment_id>[0-9]+)/intelligence/pages",
    )
    def attachment_intelligence_pages(self, request, pk=None, attachment_id=None):
        """
        Authorized page-level extracted text (Phase 3).

        Query params:
          - page: filter single page_number
          - page_size / offset: pagination (default page_size=20, max 100)
        """
        source = self.get_object()
        att = self._cabinet_scoped_attachment(source, attachment_id)
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            intel = att.intelligence
        except CaseAttachmentIntelligence.DoesNotExist:
            return Response({"detail": "Intelligence not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = CaseAttachmentPage.objects.filter(intelligence=intel).order_by("page_number")
        page_filter = request.query_params.get("page")
        if page_filter is not None and str(page_filter).strip() != "":
            try:
                qs = qs.filter(page_number=int(page_filter))
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Invalid page number.", "code": "invalid_page"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except (TypeError, ValueError):
            page_size = 20
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except (TypeError, ValueError):
            offset = 0

        total = qs.count()
        items = qs[offset : offset + page_size]
        return Response(
            {
                "count": total,
                "offset": offset,
                "page_size": page_size,
                "results": CaseAttachmentPageSerializer(items, many=True).data,
            }
        )

    @action(
        detail=True,
        methods=["GET"],
        url_path="attachments/(?P<attachment_id>[0-9]+)/intelligence/derived",
    )
    def download_derived_ocr(self, request, pk=None, attachment_id=None):
        """Download derived OCR PDF (never the original path). Cabinet-scoped."""
        source = self.get_object()
        att = self._cabinet_scoped_attachment(source, attachment_id)
        if not att:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            intel = att.intelligence
        except CaseAttachmentIntelligence.DoesNotExist:
            return Response({"detail": "No derived OCR file."}, status=status.HTTP_404_NOT_FOUND)
        if not intel.derived_ocr_file:
            return Response({"detail": "No derived OCR file."}, status=status.HTTP_404_NOT_FOUND)
        return serve_file_field(
            request,
            intel.derived_ocr_file,
            filename=f"{att.display_name()}.ocr.pdf",
            content_type="application/pdf",
        )

    @action(detail=False, methods=["GET"], url_path="schedule-conflicts")
    def schedule_conflicts_preview(self, request):
        """
        G1 — real conflict preview for a proposed consultation window.

        Query params:
          - assignedTo: attorney user id (repeatable or comma-separated)
          - date / consultationDate: ISO datetime for window start
          - durationMinutes: positive int (default 60)
          - excludeCaseId: optional case pk to ignore (edit mode)
        """
        from datetime import timedelta

        from django.utils import timezone
        from django.utils.dateparse import parse_datetime

        from cases.schedule_conflicts import find_conflicts_for_window
        from cases.validators import _parse_datetime
        from users.models import User

        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            return Response({"detail": "User is not attached to any cabinet."}, status=status.HTTP_403_FORBIDDEN)

        raw_ids = request.query_params.getlist("assignedTo") or request.query_params.getlist("assigned_to")
        if not raw_ids:
            single = request.query_params.get("assignedTo") or request.query_params.get("assigned_to")
            if single:
                raw_ids = [single]
        attorney_ids: list[int] = []
        for chunk in raw_ids:
            for part in str(chunk).split(","):
                part = part.strip()
                if not part:
                    continue
                try:
                    attorney_ids.append(int(part))
                except (TypeError, ValueError):
                    return Response(
                        {"detail": "assignedTo must be integer user id(s).", "code": "invalid_assigned_to"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        attorney_ids = list(dict.fromkeys(attorney_ids))

        if attorney_ids:
            allowed = set(
                User.objects.filter(
                    cabinet=cabinet,
                    is_cabinet_member=True,
                    id__in=attorney_ids,
                ).values_list("id", flat=True)
            )
            if set(attorney_ids) - allowed:
                return Response(
                    {"detail": "One or more attorneys are not in your cabinet.", "code": "attorney_not_in_cabinet"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        date_raw = (
            request.query_params.get("consultationDate")
            or request.query_params.get("date")
            or ""
        ).strip()
        if not date_raw:
            return Response({"conflicts": []})

        start = _parse_datetime(date_raw) or parse_datetime(date_raw)
        if not start:
            return Response(
                {"detail": "Invalid date.", "code": "invalid_date"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(start):
            start = timezone.make_aware(start, timezone.get_current_timezone())

        duration_raw = request.query_params.get("durationMinutes") or request.query_params.get("duration_minutes") or "60"
        try:
            duration = int(duration_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "durationMinutes must be a positive integer.", "code": "invalid_duration"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if duration <= 0 or duration > 24 * 60:
            return Response(
                {"detail": "durationMinutes out of range.", "code": "invalid_duration"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        end = start + timedelta(minutes=duration)

        exclude_raw = request.query_params.get("excludeCaseId") or request.query_params.get("exclude_case_id")
        exclude_id = None
        if exclude_raw:
            try:
                exclude_id = int(exclude_raw)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "excludeCaseId must be an integer.", "code": "invalid_exclude"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not attorney_ids:
            return Response({"conflicts": []})

        conflicts = find_conflicts_for_window(
            cabinet_id=cabinet.id,
            start=start,
            end=end,
            attorney_ids=attorney_ids,
            exclude_case_id=exclude_id,
        )
        return Response({"conflicts": conflicts})

    def _conflicts_for(self, case):
        try:
            return find_schedule_conflicts(case)
        except Exception:
            return []
