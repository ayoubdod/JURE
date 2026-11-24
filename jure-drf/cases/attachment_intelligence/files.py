"""Secure local path helpers for attachment OCR. Never log file contents."""

from __future__ import annotations

import hashlib
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from django.core.files.base import ContentFile


@contextmanager
def temporary_workdir(prefix: str = "jure-att-ocr-") -> Iterator[Path]:
    """Create a private temp directory and always clean it up."""
    path = Path(tempfile.mkdtemp(prefix=prefix))
    try:
        yield path
    finally:
        _rmtree_quiet(path)


def materialize_upload(file_field, dest: Path) -> Path:
    """Copy a Django FileField to a local path without mutating the original."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with file_field.open("rb") as src, open(dest, "wb") as out:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    return dest


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def file_size_bytes(file_field) -> int:
    try:
        return int(file_field.size)
    except Exception:
        return 0


def save_derived_pdf(intelligence, source_path: Path, *, original_name: str) -> None:
    """Persist derived OCR PDF under a separate upload_to prefix; never overwrite original."""
    stem = Path(original_name or "document").stem[:80] or "document"
    name = f"{stem}.ocr.pdf"
    with open(source_path, "rb") as fh:
        intelligence.derived_ocr_file.save(name, ContentFile(fh.read()), save=True)


def _rmtree_quiet(path: Path) -> None:
    try:
        for root, dirs, files in os.walk(path, topdown=False):
            for name in files:
                try:
                    os.unlink(os.path.join(root, name))
                except OSError:
                    pass
            for name in dirs:
                try:
                    os.rmdir(os.path.join(root, name))
                except OSError:
                    pass
        path.rmdir()
    except OSError:
        pass
