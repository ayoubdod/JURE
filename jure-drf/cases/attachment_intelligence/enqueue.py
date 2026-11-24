"""Create / retry / reprocess intelligence rows and schedule background processing."""

from __future__ import annotations

import logging

from django.db import transaction

from cases.models import CaseAttachment, CaseAttachmentIntelligence
from juria.constants import OcrStatus

from .extraction import clear_extracted_pages
from .locking import TERMINAL_OCR_OK, reset_for_retry
from .runner import schedule_intelligence_job

logger = logging.getLogger(__name__)


def enqueue_attachment_intelligence(attachment: CaseAttachment | int) -> CaseAttachmentIntelligence:
    """
    Ensure a CaseAttachmentIntelligence row exists and schedule OCR + extraction.

    Safe to call multiple times — reuses the 1:1 row. Skips reschedule when already
    READY with terminal OCR (idempotent). Does not block upload when runner is thread/poll_only.
    """
    if isinstance(attachment, int):
        attachment = CaseAttachment.objects.get(pk=attachment)

    with transaction.atomic():
        row, created = CaseAttachmentIntelligence.objects.get_or_create(
            attachment=attachment,
            defaults={
                "extraction_status": CaseAttachmentIntelligence.ExtractionStatus.PENDING,
                "ocr_status": OcrStatus.PENDING,
            },
        )
        if not created:
            if row.ocr_status == OcrStatus.RUNNING or (
                row.extraction_status == CaseAttachmentIntelligence.ExtractionStatus.RUNNING
            ):
                return row
            if (
                row.extraction_status == CaseAttachmentIntelligence.ExtractionStatus.READY
                and row.ocr_status in TERMINAL_OCR_OK
            ):
                return row

    schedule_intelligence_job(row.pk)
    row.refresh_from_db()
    return row


def retry_attachment_intelligence(attachment: CaseAttachment | int) -> CaseAttachmentIntelligence:
    """Reset a failed/required job to PENDING and schedule again."""
    if isinstance(attachment, int):
        attachment = CaseAttachment.objects.select_related("intelligence").get(pk=attachment)
    else:
        attachment = CaseAttachment.objects.select_related("intelligence").get(pk=attachment.pk)

    try:
        row = attachment.intelligence
    except CaseAttachmentIntelligence.DoesNotExist:
        return enqueue_attachment_intelligence(attachment)

    clear_extracted_pages(row)
    row = reset_for_retry(row, force=False)
    schedule_intelligence_job(row.pk)
    row.refresh_from_db()
    return row


def reprocess_attachment_intelligence(
    attachment: CaseAttachment | int,
    *,
    force: bool = True,
) -> CaseAttachmentIntelligence:
    """
    Explicit re-extraction (and OCR as needed).

    Clears obsolete page rows, resets status to PENDING, schedules processing.
    force=True is required to reprocess an already READY document.
    """
    if isinstance(attachment, int):
        attachment = CaseAttachment.objects.select_related("intelligence").get(pk=attachment)
    else:
        attachment = CaseAttachment.objects.select_related("intelligence").get(pk=attachment.pk)

    try:
        row = attachment.intelligence
    except CaseAttachmentIntelligence.DoesNotExist:
        return enqueue_attachment_intelligence(attachment)

    clear_extracted_pages(row)
    row = reset_for_retry(row, force=force)
    schedule_intelligence_job(row.pk)
    row.refresh_from_db()
    return row