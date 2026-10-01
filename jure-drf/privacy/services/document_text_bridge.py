"""Bridge document extraction for the privacy gateway without circular imports."""

from __future__ import annotations

from juria.services.document_text import DocumentTextError, extract_document_text
from juria.services.juria_api_service import JuriaDocumentError


def extract_for_privacy(file_path: str, file_type: str) -> str:
    try:
        return extract_document_text(file_path, file_type)
    except DocumentTextError as exc:
        raise JuriaDocumentError(str(exc)) from exc
