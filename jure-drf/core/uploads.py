"""UUID-based upload_to helpers and dangerous-extension rejection."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

from core.downloads import BLOCKED_UPLOAD_EXTENSIONS


@deconstructible
class UUIDUploadTo:
    """Migration-serializable upload_to callable for ``prefix/<uuid><ext>`` paths."""

    def __init__(self, prefix: str):
        self.prefix = prefix

    def __call__(self, instance, filename: str) -> str:
        ext = Path(filename or "").suffix.lower()
        if ext in BLOCKED_UPLOAD_EXTENSIONS:
            ext = ".bin"
        return f"{self.prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"


def uuid_upload_to(prefix: str):
    """Return an upload_to callable that stores files under ``prefix/<uuid><ext>``."""

    return UUIDUploadTo(prefix)


def validate_safe_upload_extension(file_obj):
    name = getattr(file_obj, "name", "") or ""
    ext = os.path.splitext(name)[1].lower()
    if ext in BLOCKED_UPLOAD_EXTENSIONS:
        raise ValidationError(
            f"File type '{ext}' is not allowed. Upload a document or media file instead."
        )
