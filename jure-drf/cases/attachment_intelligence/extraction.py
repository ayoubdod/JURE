"""
Phase 3 — page-aware text extraction and persistence.

Reuses juria.services.document_text.extract_document_pages (pypdf) for reading
text layers. Does not re-OCR originals when a derived OCR PDF exists.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from cases.models import CaseAttachmentIntelligence, CaseAttachmentPage
from juria.services.document_text import DocumentTextError, extract_document_pages

from . import settings as ocr_settings
from .errors import EXTRACTION_FAILED, TOO_MANY_CHARS, AttachmentIntelligenceError
from .pdf_analysis import PdfAnalysis

logger = logging.getLogger(__name__)

EXTRACTION_VERSION = "1"

# Strip only NUL / unpaired controls that break DB/XML — keep Arabic, accents, RTL marks.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str
    method: str  # NATIVE | OCR
    character_count: int
    confidence_score: float | None = None


def normalize_page_text(text: str) -> str:
    """Safe encoding normalization without destructive Unicode folding."""
    if not text:
        return ""
    if isinstance(text, bytes):
        text = text.decode("utf-8", errors="replace")
    # NFC would be optional; avoid aggressive NFKC that can alter legal glyphs.
    return _CONTROL_CHARS.sub("", text)


def extract_pages_from_paths(
    *,
    original_path: str,
    derived_ocr_path: str | None,
    analysis: PdfAnalysis,
) -> list[ExtractedPage]:
    """
    Build ordered page extractions.

    Digital pages → native text from original.
    Scanned pages → text from derived OCR PDF when present, else original (often empty).
    Mixed → per-page method, preserving page numbers.
    """
    native_by_page = _pages_map(original_path)
    ocr_by_page: dict[int, str] = {}
    if derived_ocr_path:
        ocr_by_page = _pages_map(derived_ocr_path)

    max_chars = ocr_settings.max_chars_per_page()
    results: list[ExtractedPage] = []

    for page_info in analysis.pages:
        n = page_info.page
        if page_info.needs_ocr:
            raw = ocr_by_page.get(n)
            if raw is None:
                raw = native_by_page.get(n, "")
            method = CaseAttachmentPage.ExtractionMethod.OCR
        else:
            raw = native_by_page.get(n, "")
            method = CaseAttachmentPage.ExtractionMethod.NATIVE

        text = normalize_page_text(raw or "")
        if len(text) > max_chars:
            raise AttachmentIntelligenceError(
                TOO_MANY_CHARS,
                f"Page {n} exceeds max extracted characters.",
            )
        results.append(
            ExtractedPage(
                page_number=n,
                text=text,
                method=method,
                character_count=len(text),
                confidence_score=None,  # OCRmyPDF/Tesseract path does not expose per-page confidence
            )
        )

    # Ensure empty trailing pages from analysis are covered even if maps differ.
    if not results and analysis.page_count:
        for n in range(1, analysis.page_count + 1):
            results.append(
                ExtractedPage(
                    page_number=n,
                    text="",
                    method=CaseAttachmentPage.ExtractionMethod.NATIVE,
                    character_count=0,
                    confidence_score=None,
                )
            )

    results.sort(key=lambda p: p.page_number)
    total = sum(p.character_count for p in results)
    max_total = ocr_settings.max_total_chars()
    if total > max_total:
        raise AttachmentIntelligenceError(
            TOO_MANY_CHARS,
            "Document exceeds max total extracted characters.",
        )
    return results


def persist_extracted_pages(
    intelligence: CaseAttachmentIntelligence,
    pages: list[ExtractedPage],
    *,
    replace: bool = True,
) -> CaseAttachmentIntelligence:
    """
    Idempotent page persistence inside a transaction.

    Replaces obsolete page rows when reprocessing. Never marks READY itself —
    caller sets extraction status after this returns.
    """
    with transaction.atomic():
        locked = CaseAttachmentIntelligence.objects.select_for_update().get(pk=intelligence.pk)
        if replace:
            locked.pages.all().delete()

        CaseAttachmentPage.objects.bulk_create(
            [
                CaseAttachmentPage(
                    intelligence=locked,
                    page_number=p.page_number,
                    extracted_text=p.text,
                    extraction_method=p.method,
                    character_count=p.character_count,
                    confidence_score=p.confidence_score,
                )
                for p in pages
            ]
        )

        total = sum(p.character_count for p in pages)
        now = timezone.now()
        locked.total_extracted_chars = total
        locked.extraction_version = EXTRACTION_VERSION
        locked.extracted_at = now
        locked.extraction_completed_at = now
        locked.page_count = len(pages) if pages else locked.page_count
        locked.save(
            update_fields=[
                "total_extracted_chars",
                "extraction_version",
                "extracted_at",
                "extraction_completed_at",
                "page_count",
                "modified",
            ]
        )
        return locked


def clear_extracted_pages(intelligence: CaseAttachmentIntelligence) -> None:
    CaseAttachmentPage.objects.filter(intelligence=intelligence).delete()
    intelligence.total_extracted_chars = None
    intelligence.extraction_version = ""
    intelligence.extracted_at = None
    intelligence.extraction_completed_at = None
    intelligence.save(
        update_fields=[
            "total_extracted_chars",
            "extraction_version",
            "extracted_at",
            "extraction_completed_at",
            "modified",
        ]
    )


def _pages_map(file_path: str) -> dict[int, str]:
    # NullOcrEngine may register exact Unicode fixtures (Arabic/French) for tests.
    from .ocr_engine import get_fixture_page_texts

    fixture = get_fixture_page_texts(file_path)
    if fixture is not None:
        return dict(fixture)

    try:
        pages = extract_document_pages(file_path, "pdf")
    except DocumentTextError as exc:
        raise AttachmentIntelligenceError(EXTRACTION_FAILED, "Unable to extract PDF text.") from exc
    except Exception as exc:
        logger.warning("extract_document_pages failed path_len=%s", len(file_path or ""))
        raise AttachmentIntelligenceError(EXTRACTION_FAILED, "Unable to extract PDF text.") from exc

    out: dict[int, str] = {}
    for item in pages:
        try:
            num = int(item.get("page") or 0)
        except (TypeError, ValueError):
            continue
        if num < 1:
            continue
        out[num] = item.get("text") or ""
    return out
