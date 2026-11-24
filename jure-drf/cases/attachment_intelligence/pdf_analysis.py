"""Detect digital vs scanned vs mixed PDFs without calling OCR."""

from __future__ import annotations

from dataclasses import dataclass, field

from pypdf import PdfReader

from . import settings as ocr_settings
from .errors import (
    CORRUPT_PDF,
    ENCRYPTED_PDF,
    TOO_MANY_PAGES,
    AttachmentIntelligenceError,
)


@dataclass(frozen=True)
class PageAnalysis:
    page: int
    char_count: int
    needs_ocr: bool


@dataclass(frozen=True)
class PdfAnalysis:
    page_count: int
    pages: list[PageAnalysis] = field(default_factory=list)
    scanned_page_count: int = 0
    is_scanned: bool = False
    is_mixed: bool = False
    is_digital: bool = False
    needs_ocr: bool = False

    @property
    def pages_needing_ocr(self) -> list[int]:
        return [p.page for p in self.pages if p.needs_ocr]


def analyze_pdf(file_path: str) -> PdfAnalysis:
    """
    Classify each page by native text density.

    - Digital: all pages have sufficient native text → OCR not needed
    - Scanned: all pages lack native text → OCR required
    - Mixed: some pages need OCR, some do not
    """
    min_chars = ocr_settings.min_chars_per_page()
    max_pages = ocr_settings.max_pages()

    try:
        reader = PdfReader(file_path)
    except Exception as exc:
        raise AttachmentIntelligenceError(CORRUPT_PDF, "Unable to read this PDF.") from exc

    if getattr(reader, "is_encrypted", False):
        try:
            result = reader.decrypt("")
            if result == 0:
                raise AttachmentIntelligenceError(ENCRYPTED_PDF, "This PDF is password-protected.")
        except AttachmentIntelligenceError:
            raise
        except Exception as exc:
            raise AttachmentIntelligenceError(ENCRYPTED_PDF, "This PDF is password-protected.") from exc

    page_count = len(reader.pages)
    if page_count > max_pages:
        raise AttachmentIntelligenceError(
            TOO_MANY_PAGES,
            f"PDF has {page_count} pages (limit {max_pages}).",
        )

    pages: list[PageAnalysis] = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        char_count = len(text.strip())
        pages.append(
            PageAnalysis(
                page=index,
                char_count=char_count,
                needs_ocr=char_count < min_chars,
            )
        )

    scanned = sum(1 for p in pages if p.needs_ocr)
    digital = page_count - scanned
    is_scanned = scanned > 0 and digital == 0
    is_digital = scanned == 0 and page_count > 0
    is_mixed = scanned > 0 and digital > 0

    return PdfAnalysis(
        page_count=page_count,
        pages=pages,
        scanned_page_count=scanned,
        is_scanned=is_scanned or is_mixed,
        is_mixed=is_mixed,
        is_digital=is_digital,
        needs_ocr=scanned > 0,
    )
