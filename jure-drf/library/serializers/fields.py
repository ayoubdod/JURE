from rest_framework import serializers

from ..constants import (
    LIBRARY_SCOPE_INTERNATIONAL,
    LIBRARY_SCOPE_LOCAL,
    VISIBILITY_TO_LIBRARY_SCOPE,
)
from ..models import Document

MAX_DOCUMENT_BYTES = 25 * 1024 * 1024
ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt",
    ".xls", ".xlsx", ".csv",
    ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".ppt", ".pptx",
}


def _user_display_name(user) -> str | None:
    if user is None:
        return None
    full = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
    return full or getattr(user, "email", None) or None


def _source_library_label(instance: Document) -> str | None:
    scope = VISIBILITY_TO_LIBRARY_SCOPE.get(instance.visibility_scope)
    if scope == LIBRARY_SCOPE_LOCAL:
        jur = getattr(instance, "jurisdiction", None)
        name = getattr(jur, "name", None) or getattr(jur, "code", None) or ""
        return f"Local Library — {name}".strip(" —") if name else "Local Library"
    if scope == LIBRARY_SCOPE_INTERNATIONAL:
        return "International Library"
    return None


class SafeFileURLField(serializers.FileField):
    """File URL that never raises if the blob is missing from disk/S3."""

    def to_representation(self, value):
        try:
            return super().to_representation(value)
        except (OSError, ValueError, AttributeError):
            name = getattr(value, "name", None)
            return name or None
