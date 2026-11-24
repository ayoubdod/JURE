"""
OCRmyPDF + Tesseract engine for case attachments.

External OCR APIs are never used. The engine is injectable for deterministic tests.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from . import settings as ocr_settings
from .errors import (
    OCR_ENGINE_ERROR,
    OCR_UNAVAILABLE,
    TIMEOUT,
    AttachmentIntelligenceError,
)
from .pdf_analysis import PdfAnalysis

logger = logging.getLogger(__name__)

# Deterministic OCR page texts for NullOcrEngine (tests). Keyed by resolved output path.
_FIXTURE_TEXT_BY_PATH: dict[str, dict[int, str]] = {}


@dataclass(frozen=True)
class OcrResult:
    success: bool
    output_path: str | None = None
    detected_languages: list[str] = field(default_factory=list)
    engine: str = ""
    skipped: bool = False


class OcrEngine(Protocol):
    def run(self, input_path: str, output_path: str, analysis: PdfAnalysis) -> OcrResult: ...


class OcrmypdfEngine:
    """Production engine: OCRmyPDF with Tesseract (fra+ara+eng)."""

    def run(self, input_path: str, output_path: str, analysis: PdfAnalysis) -> OcrResult:
        if not analysis.needs_ocr:
            return OcrResult(
                success=True,
                output_path=None,
                detected_languages=[],
                engine=ocr_settings.engine_name(),
                skipped=True,
            )

        if shutil.which("tesseract") is None:
            raise AttachmentIntelligenceError(
                OCR_UNAVAILABLE,
                "Tesseract is not installed on this host.",
            )

        languages = ocr_settings.ocr_languages()
        timeout = ocr_settings.timeout_seconds()
        cmd = [
            "ocrmypdf",
            "--skip-text",
            # Derived OCR PDF only — original upload is never overwritten.
            "--invalidate-digital-signatures",
            "--language",
            languages,
            "--jobs",
            "1",
            "--optimize",
            "0",
            "--output-type",
            "pdf",
            input_path,
            output_path,
        ]
        try:
            completed = subprocess.run(
                cmd,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except FileNotFoundError as exc:
            raise AttachmentIntelligenceError(
                OCR_UNAVAILABLE,
                "ocrmypdf is not installed.",
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise AttachmentIntelligenceError(TIMEOUT, "OCR timed out.") from exc

        if completed.returncode != 0:
            logger.warning(
                "ocrmypdf failed attachment OCR exit_code=%s",
                completed.returncode,
            )
            raise AttachmentIntelligenceError(OCR_ENGINE_ERROR, "OCR engine failed.")

        if not Path(output_path).is_file():
            raise AttachmentIntelligenceError(OCR_ENGINE_ERROR, "OCR produced no output.")

        return OcrResult(
            success=True,
            output_path=output_path,
            detected_languages=_languages_list(languages),
            engine=ocr_settings.engine_name(),
            skipped=False,
        )


class NullOcrEngine:
    """
    Test double: simulates OCR without Tesseract.

    When `page_texts` is provided, registers exact Unicode strings for extraction
    (supports Arabic/French fixtures without embedding fonts) and still writes a
    derived PDF file (copy of input) for storage/idempotency tests.
    """

    def __init__(
        self,
        *,
        languages: list[str] | None = None,
        fail: bool = False,
        page_texts: list[str] | None = None,
    ):
        self.languages = languages or ["fra", "ara", "eng"]
        self.fail = fail
        self.page_texts = page_texts

    def run(self, input_path: str, output_path: str, analysis: PdfAnalysis) -> OcrResult:
        if self.fail:
            raise AttachmentIntelligenceError(OCR_ENGINE_ERROR, "Forced OCR failure.")
        if not analysis.needs_ocr:
            return OcrResult(
                success=True,
                skipped=True,
                engine="null",
                detected_languages=[],
            )

        shutil.copyfile(input_path, output_path)
        resolved = str(Path(output_path).resolve())
        if self.page_texts is not None:
            _FIXTURE_TEXT_BY_PATH[resolved] = {
                i + 1: (self.page_texts[i] if i < len(self.page_texts) else "")
                for i in range(analysis.page_count)
            }
        else:
            _FIXTURE_TEXT_BY_PATH.pop(resolved, None)

        return OcrResult(
            success=True,
            output_path=output_path,
            detected_languages=list(self.languages),
            engine="null",
            skipped=False,
        )


def get_fixture_page_texts(path: str) -> dict[int, str] | None:
    if not path:
        return None
    return _FIXTURE_TEXT_BY_PATH.get(str(Path(path).resolve()))


def clear_fixture_page_texts() -> None:
    _FIXTURE_TEXT_BY_PATH.clear()


_engine_override: OcrEngine | None = None


def set_ocr_engine_override(engine: OcrEngine | None) -> None:
    """Tests inject a deterministic engine; production leaves this None."""
    global _engine_override
    _engine_override = engine
    if engine is None:
        clear_fixture_page_texts()


def get_ocr_engine() -> OcrEngine:
    if _engine_override is not None:
        return _engine_override
    return OcrmypdfEngine()


def _languages_list(spec: str) -> list[str]:
    return [part.strip() for part in spec.replace(",", "+").split("+") if part.strip()]
