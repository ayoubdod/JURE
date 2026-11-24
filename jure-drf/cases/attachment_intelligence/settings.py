"""Settings helpers for attachment OCR (Phase 2)."""

from __future__ import annotations

from django.conf import settings


def ocr_languages() -> str:
    return getattr(settings, "ATTACHMENT_OCR_LANGUAGES", "fra+ara+eng")


def max_bytes() -> int:
    return int(getattr(settings, "ATTACHMENT_OCR_MAX_BYTES", 50 * 1024 * 1024))


def max_pages() -> int:
    return int(getattr(settings, "ATTACHMENT_OCR_MAX_PAGES", 200))


def timeout_seconds() -> int:
    return int(getattr(settings, "ATTACHMENT_OCR_TIMEOUT_SECONDS", 300))


def min_chars_per_page() -> int:
    """Pages with fewer extractable characters are treated as scanned/image-only."""
    return int(getattr(settings, "ATTACHMENT_OCR_MIN_CHARS_PER_PAGE", 40))


def keep_derived() -> bool:
    return bool(getattr(settings, "ATTACHMENT_OCR_KEEP_DERIVED", True))


def runner_mode() -> str:
    """
    thread     — daemon thread after enqueue (default; fine for single Daphne process)
    sync       — run inline (tests / debugging)
    poll_only  — only the management command processes jobs (production durable mode)
    """
    return str(getattr(settings, "ATTACHMENT_OCR_RUNNER", "thread")).strip().lower()


def engine_name() -> str:
    return "ocrmypdf+tesseract"


def max_chars_per_page() -> int:
    return int(getattr(settings, "ATTACHMENT_EXTRACTION_MAX_CHARS_PER_PAGE", 200_000))


def max_total_chars() -> int:
    return int(getattr(settings, "ATTACHMENT_EXTRACTION_MAX_TOTAL_CHARS", 2_000_000))
