"""Claim / release processing locks to prevent duplicate concurrent OCR/extraction jobs."""

from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from cases.models import CaseAttachmentIntelligence
from juria.constants import OcrStatus

from .errors import LOCKED, AttachmentIntelligenceError


CLAIMABLE_OCR = {
    OcrStatus.PENDING,
    OcrStatus.REQUIRED,
    OcrStatus.FAILED,
}
CLAIMABLE_EXTRACTION = {
    CaseAttachmentIntelligence.ExtractionStatus.PENDING,
    CaseAttachmentIntelligence.ExtractionStatus.FAILED,
}
TERMINAL_OCR_OK = {OcrStatus.NOT_NEEDED, OcrStatus.COMPLETED}


def claim_for_processing(intelligence_id: int) -> CaseAttachmentIntelligence:
    """
    Atomically transition claimable rows → RUNNING.

    - Full claim: OCR + extraction → RUNNING when OCR is pending/required/failed
      or extraction is pending/failed without a successful OCR terminal state.
    - Extract-only: OCR already NOT_NEEDED/COMPLETED and extraction FAILED/PENDING
      → only extraction → RUNNING (OCR status preserved).
    """
    lock_token = uuid.uuid4().hex
    with transaction.atomic():
        try:
            row = (
                CaseAttachmentIntelligence.objects.select_for_update()
                .select_related("attachment", "attachment__case")
                .get(pk=intelligence_id)
            )
        except CaseAttachmentIntelligence.DoesNotExist as exc:
            raise AttachmentIntelligenceError(LOCKED, "Intelligence row missing.") from exc

        if row.ocr_status == OcrStatus.RUNNING or (
            row.extraction_status == CaseAttachmentIntelligence.ExtractionStatus.RUNNING
        ):
            raise AttachmentIntelligenceError(LOCKED, "Already processing.")

        extract_only = (
            row.ocr_status in TERMINAL_OCR_OK
            and row.extraction_status in CLAIMABLE_EXTRACTION
        )
        full_claim = row.ocr_status in CLAIMABLE_OCR or (
            row.extraction_status in CLAIMABLE_EXTRACTION and row.ocr_status not in TERMINAL_OCR_OK
        )

        if not extract_only and not full_claim:
            raise AttachmentIntelligenceError(LOCKED, "Not claimable in current status.")

        if extract_only and not full_claim:
            row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.RUNNING
            row.processing_lock = lock_token
            row.processing_error_code = ""
            row.save(
                update_fields=[
                    "extraction_status",
                    "processing_lock",
                    "processing_error_code",
                    "modified",
                ]
            )
            return row

        row.ocr_status = OcrStatus.RUNNING
        row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.RUNNING
        row.processing_lock = lock_token
        row.processing_error_code = ""
        row.save(
            update_fields=[
                "ocr_status",
                "extraction_status",
                "processing_lock",
                "processing_error_code",
                "modified",
            ]
        )
        return row


def mark_ocr_done(
    row: CaseAttachmentIntelligence,
    *,
    ocr_status: str,
    is_scanned: bool | None,
    page_count: int | None,
    scanned_page_count: int | None,
    detected_languages: list[str],
    content_hash: str,
    ocr_engine: str,
) -> CaseAttachmentIntelligence:
    """OCR finished successfully; extraction still RUNNING until pages persist."""
    row.ocr_status = ocr_status
    row.is_scanned = is_scanned
    row.page_count = page_count
    row.scanned_page_count = scanned_page_count
    row.detected_languages = detected_languages
    row.content_hash = content_hash
    row.ocr_engine = ocr_engine
    row.processed_at = timezone.now()
    # Keep extraction RUNNING and lock held until extraction completes.
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.RUNNING
    row.save(
        update_fields=[
            "ocr_status",
            "is_scanned",
            "page_count",
            "scanned_page_count",
            "detected_languages",
            "content_hash",
            "ocr_engine",
            "processed_at",
            "extraction_status",
            "modified",
        ]
    )
    return row


def mark_extraction_ready(row: CaseAttachmentIntelligence) -> CaseAttachmentIntelligence:
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.READY
    row.processing_error_code = ""
    row.processing_lock = ""
    if not row.extraction_completed_at:
        row.extraction_completed_at = timezone.now()
    row.save(
        update_fields=[
            "extraction_status",
            "processing_error_code",
            "processing_lock",
            "extraction_completed_at",
            "modified",
        ]
    )
    return row


def mark_extraction_failed(
    row: CaseAttachmentIntelligence,
    code: str,
    *,
    keep_ocr_status: bool = True,
) -> CaseAttachmentIntelligence:
    """
    Extraction failed. OCR may remain COMPLETED/NOT_NEEDED when keep_ocr_status=True.
    Never leaves extraction_status=READY.
    """
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.FAILED
    if not keep_ocr_status:
        row.ocr_status = OcrStatus.FAILED
    row.processing_error_code = (code or "EXTRACTION_FAILED")[:64]
    row.processing_lock = ""
    row.save(
        update_fields=[
            "extraction_status",
            "ocr_status",
            "processing_error_code",
            "processing_lock",
            "modified",
        ]
    )
    return row


def mark_success(
    row: CaseAttachmentIntelligence,
    *,
    ocr_status: str,
    is_scanned: bool | None,
    page_count: int | None,
    scanned_page_count: int | None,
    detected_languages: list[str],
    content_hash: str,
    ocr_engine: str,
    extraction_status: str = CaseAttachmentIntelligence.ExtractionStatus.READY,
) -> CaseAttachmentIntelligence:
    """Terminal success for non-PDF skip / legacy callers (sets OCR + extraction together)."""
    row.ocr_status = ocr_status
    row.extraction_status = extraction_status
    row.is_scanned = is_scanned
    row.page_count = page_count
    row.scanned_page_count = scanned_page_count
    row.detected_languages = detected_languages
    row.content_hash = content_hash
    row.ocr_engine = ocr_engine
    row.processing_error_code = ""
    row.processing_lock = ""
    row.processed_at = timezone.now()
    if extraction_status == CaseAttachmentIntelligence.ExtractionStatus.READY:
        now = timezone.now()
        row.extracted_at = row.extracted_at or now
        row.extraction_completed_at = now
    row.save(
        update_fields=[
            "ocr_status",
            "extraction_status",
            "is_scanned",
            "page_count",
            "scanned_page_count",
            "detected_languages",
            "content_hash",
            "ocr_engine",
            "processing_error_code",
            "processing_lock",
            "processed_at",
            "extracted_at",
            "extraction_completed_at",
            "modified",
        ]
    )
    return row


def mark_failed(row: CaseAttachmentIntelligence, code: str) -> CaseAttachmentIntelligence:
    row.ocr_status = OcrStatus.FAILED
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.FAILED
    row.processing_error_code = (code or "INTERNAL")[:64]
    row.processing_lock = ""
    row.processed_at = timezone.now()
    row.save(
        update_fields=[
            "ocr_status",
            "extraction_status",
            "processing_error_code",
            "processing_lock",
            "processed_at",
            "modified",
        ]
    )
    return row


def mark_ocr_required(
    row: CaseAttachmentIntelligence,
    *,
    code: str,
    is_scanned: bool = True,
    page_count: int | None = None,
    scanned_page_count: int | None = None,
    content_hash: str = "",
) -> CaseAttachmentIntelligence:
    """Scanned PDF detected but OCR engine unavailable — extraction cannot complete."""
    row.ocr_status = OcrStatus.REQUIRED
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.FAILED
    row.is_scanned = is_scanned
    row.page_count = page_count
    row.scanned_page_count = scanned_page_count
    row.content_hash = content_hash
    row.processing_error_code = (code or "OCR_UNAVAILABLE")[:64]
    row.processing_lock = ""
    row.processed_at = timezone.now()
    row.save(
        update_fields=[
            "ocr_status",
            "extraction_status",
            "is_scanned",
            "page_count",
            "scanned_page_count",
            "content_hash",
            "processing_error_code",
            "processing_lock",
            "processed_at",
            "modified",
        ]
    )
    return row


def reset_for_retry(
    row: CaseAttachmentIntelligence,
    *,
    force: bool = False,
) -> CaseAttachmentIntelligence:
    """
    Safe retry / reprocess: → PENDING so a worker can claim again.

    force=True allows resetting READY rows (explicit reprocess).
    """
    with transaction.atomic():
        locked = CaseAttachmentIntelligence.objects.select_for_update().get(pk=row.pk)
        if locked.ocr_status == OcrStatus.RUNNING or (
            locked.extraction_status == CaseAttachmentIntelligence.ExtractionStatus.RUNNING
        ):
            raise AttachmentIntelligenceError(LOCKED, "Cannot retry while running.")
        if (
            not force
            and locked.extraction_status == CaseAttachmentIntelligence.ExtractionStatus.READY
            and locked.ocr_status in TERMINAL_OCR_OK
        ):
            raise AttachmentIntelligenceError(LOCKED, "Already completed; use force reprocess.")

        locked.ocr_status = OcrStatus.PENDING
        locked.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.PENDING
        locked.processing_error_code = ""
        locked.processing_lock = ""
        locked.save(
            update_fields=[
                "ocr_status",
                "extraction_status",
                "processing_error_code",
                "processing_lock",
                "modified",
            ]
        )
        return locked


def release_unchanged(
    row: CaseAttachmentIntelligence,
    *,
    content_hash: str,
) -> CaseAttachmentIntelligence:
    """Hash unchanged and extraction already READY — restore terminal state without rework."""
    row.content_hash = content_hash
    row.extraction_status = CaseAttachmentIntelligence.ExtractionStatus.READY
    row.processing_lock = ""
    row.processing_error_code = ""
    row.save(
        update_fields=[
            "content_hash",
            "extraction_status",
            "processing_lock",
            "processing_error_code",
            "modified",
        ]
    )
    return row
