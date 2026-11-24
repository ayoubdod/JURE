"""
Process a single CaseAttachmentIntelligence row: OCR (Phase 2) + text extraction (Phase 3).

Original FileField is never mutated. Full extracted text is stored on CaseAttachmentPage only.
"""

from __future__ import annotations

import logging
from pathlib import Path

from cases.models import CaseAttachmentIntelligence
from juria.constants import OcrStatus

from . import settings as ocr_settings
from .errors import (
    CORRUPT_PDF,
    EXTRACTION_FAILED,
    INTERNAL,
    LOCKED,
    MISSING_FILE,
    OCR_UNAVAILABLE,
    TOO_LARGE,
    AttachmentIntelligenceError,
)
from .extraction import (
    clear_extracted_pages,
    extract_pages_from_paths,
    persist_extracted_pages,
)
from .files import (
    file_size_bytes,
    materialize_upload,
    save_derived_pdf,
    sha256_file,
    temporary_workdir,
)
from .locking import (
    TERMINAL_OCR_OK,
    claim_for_processing,
    mark_extraction_failed,
    mark_extraction_ready,
    mark_failed,
    mark_ocr_done,
    mark_ocr_required,
    mark_success,
    release_unchanged,
)
from .ocr_engine import get_ocr_engine
from .pdf_analysis import analyze_pdf

logger = logging.getLogger(__name__)


def process_attachment_intelligence(
    intelligence_id: int,
    *,
    force: bool = False,
) -> CaseAttachmentIntelligence:
    try:
        row = claim_for_processing(intelligence_id)
    except AttachmentIntelligenceError as exc:
        if exc.code == LOCKED:
            return CaseAttachmentIntelligence.objects.get(pk=intelligence_id)
        raise

    # Full claim sets ocr_status=RUNNING; extract-only claim leaves terminal OCR status.
    extract_only = row.ocr_status in TERMINAL_OCR_OK
    attachment = row.attachment

    try:
        return _process_claimed(row, attachment, extract_only=extract_only, force=force)
    except AttachmentIntelligenceError as exc:
        logger.warning(
            "Attachment intelligence failed id=%s code=%s",
            intelligence_id,
            exc.code,
        )
        row.refresh_from_db()
        if extract_only or row.ocr_status in TERMINAL_OCR_OK:
            return mark_extraction_failed(row, exc.code, keep_ocr_status=True)
        return mark_failed(row, exc.code)
    except Exception:
        logger.exception("Attachment intelligence unexpected error id=%s", intelligence_id)
        row.refresh_from_db()
        if extract_only or row.ocr_status in TERMINAL_OCR_OK:
            return mark_extraction_failed(row, INTERNAL, keep_ocr_status=True)
        return mark_failed(row, INTERNAL)


def _process_claimed(
    row: CaseAttachmentIntelligence,
    attachment,
    *,
    extract_only: bool,
    force: bool,
) -> CaseAttachmentIntelligence:
    if not attachment.file:
        raise AttachmentIntelligenceError(MISSING_FILE, "Attachment has no file.")

    size = file_size_bytes(attachment.file)
    if size > ocr_settings.max_bytes():
        raise AttachmentIntelligenceError(TOO_LARGE, "File exceeds OCR size limit.")

    name = (attachment.original_name or attachment.file.name or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    if ext != "pdf":
        clear_extracted_pages(row)
        return mark_success(
            row,
            ocr_status=OcrStatus.NOT_NEEDED,
            is_scanned=False,
            page_count=None,
            scanned_page_count=None,
            detected_languages=[],
            content_hash="",
            ocr_engine="",
            extraction_status=CaseAttachmentIntelligence.ExtractionStatus.SKIPPED,
        )

    with temporary_workdir() as workdir:
        src = workdir / "original.pdf"
        out = workdir / "ocr.pdf"
        try:
            materialize_upload(attachment.file, src)
        except Exception as exc:
            raise AttachmentIntelligenceError(MISSING_FILE, "Could not read attachment file.") from exc

        content_hash = sha256_file(src)
        original_name_before = attachment.file.name
        prior_hash = row.content_hash or ""

        # Same bytes + existing pages + not forced → keep prior extraction (idempotent).
        if (
            not force
            and prior_hash
            and prior_hash == content_hash
            and row.pages.exists()
        ):
            if row.ocr_status == OcrStatus.RUNNING:
                row.ocr_status = (
                    OcrStatus.COMPLETED if row.derived_ocr_file else OcrStatus.NOT_NEEDED
                )
                row.save(update_fields=["ocr_status", "modified"])
            return release_unchanged(row, content_hash=content_hash)

        try:
            analysis = analyze_pdf(str(src))
        except AttachmentIntelligenceError:
            raise
        except Exception as exc:
            raise AttachmentIntelligenceError(CORRUPT_PDF, "Unable to analyse PDF.") from exc

        derived_path: str | None = None

        if extract_only:
            derived_path = _materialize_derived(row, workdir / "derived.pdf")
            row = mark_ocr_done(
                row,
                ocr_status=row.ocr_status,
                is_scanned=analysis.is_scanned if analysis.needs_ocr else False,
                page_count=analysis.page_count,
                scanned_page_count=analysis.scanned_page_count,
                detected_languages=list(row.detected_languages or []),
                content_hash=content_hash,
                ocr_engine=row.ocr_engine or ocr_settings.engine_name(),
            )
        elif not analysis.needs_ocr:
            row = mark_ocr_done(
                row,
                ocr_status=OcrStatus.NOT_NEEDED,
                is_scanned=False,
                page_count=analysis.page_count,
                scanned_page_count=0,
                detected_languages=[],
                content_hash=content_hash,
                ocr_engine=ocr_settings.engine_name(),
            )
        else:
            engine = get_ocr_engine()
            try:
                ocr_result = engine.run(str(src), str(out), analysis)
            except AttachmentIntelligenceError as exc:
                if exc.code == OCR_UNAVAILABLE:
                    return mark_ocr_required(
                        row,
                        code=exc.code,
                        is_scanned=True,
                        page_count=analysis.page_count,
                        scanned_page_count=analysis.scanned_page_count,
                        content_hash=content_hash,
                    )
                raise

            if ocr_settings.keep_derived() and ocr_result.output_path and Path(ocr_result.output_path).is_file():
                save_derived_pdf(
                    row,
                    Path(ocr_result.output_path),
                    original_name=attachment.display_name(),
                )
                derived_path = ocr_result.output_path
            elif ocr_result.output_path and Path(ocr_result.output_path).is_file():
                derived_path = ocr_result.output_path

            row = mark_ocr_done(
                row,
                ocr_status=OcrStatus.COMPLETED,
                is_scanned=True,
                page_count=analysis.page_count,
                scanned_page_count=analysis.scanned_page_count,
                detected_languages=list(ocr_result.detected_languages or []),
                content_hash=content_hash,
                ocr_engine=ocr_result.engine or ocr_settings.engine_name(),
            )

        if derived_path is None and row.derived_ocr_file:
            derived_path = _materialize_derived(row, workdir / "derived.pdf")

        try:
            pages = extract_pages_from_paths(
                original_path=str(src),
                derived_ocr_path=derived_path,
                analysis=analysis,
            )
            row = persist_extracted_pages(row, pages, replace=True)
            row = mark_extraction_ready(row)
        except AttachmentIntelligenceError:
            raise
        except Exception as exc:
            raise AttachmentIntelligenceError(EXTRACTION_FAILED, "Text extraction failed.") from exc

        # Phase 5B: optional local embeddings (no-op when JURIA_EMBEDDINGS_ENABLED=False).
        try:
            from juria.services.embeddings import embed_pages_for_intelligence, embeddings_enabled

            if embeddings_enabled():
                embed_pages_for_intelligence(row.pk)
        except Exception:
            logger.warning(
                "Embedding index skipped intelligence_id=%s",
                row.pk,
            )

        _assert_original_untouched(attachment, original_name_before)
        return row


def _materialize_derived(row: CaseAttachmentIntelligence, dest: Path) -> str | None:
    if not row.derived_ocr_file:
        return None
    try:
        materialize_upload(row.derived_ocr_file, dest)
        return str(dest)
    except Exception:
        logger.warning("Could not materialize derived OCR file intelligence_id=%s", row.pk)
        return None


def _assert_original_untouched(attachment, original_name: str) -> None:
    attachment.refresh_from_db()
    if attachment.file.name != original_name:
        logger.error(
            "Original attachment path changed during OCR attachment_id=%s",
            attachment.pk,
        )
        raise AttachmentIntelligenceError(INTERNAL, "Original attachment was mutated.")
