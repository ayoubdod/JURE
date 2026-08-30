"""Project-scoped retrieval. Only authorized, explicitly connected sources are searched."""

from __future__ import annotations

import logging
import os
import re
import tempfile
from typing import Any

from django.core.files.storage import default_storage

from juria.constants import OcrStatus, PermissionLevel, ResourceType, SourceKind
from juria.models import JuriaFile, JuriaProject, JuriaProjectSource
from juria.services.document_text import DocumentTextError, extract_document_pages
from juria.services.permissions import has_resource_permission

logger = logging.getLogger(__name__)

STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "en", "au", "aux",
    "ce", "cet", "cette", "ces", "the", "a", "an", "of", "and", "or", "to", "in",
    "pour", "par", "sur", "avec", "dans", "que", "qui", "quoi", "dont",
}


def _tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[A-Za-zÀ-ÿ0-9]{3,}", (text or "").lower()) if t not in STOPWORDS]


def _score(query_tokens: set[str], chunk_text: str) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = set(_tokenize(chunk_text))
    if not chunk_tokens:
        return 0.0
    overlap = query_tokens & chunk_tokens
    return len(overlap) / max(len(query_tokens), 1)


def _local_path(file_field) -> tuple[str, bool]:
    """Return (path, is_temp)."""
    name = getattr(file_field, "name", "") or ""
    if not name:
        raise DocumentTextError("File is missing.")
    if hasattr(default_storage, "path"):
        try:
            return default_storage.path(name), False
        except Exception:
            pass
    with default_storage.open(name, "rb") as fh:
        data = fh.read()
    suffix = os.path.splitext(name)[1] or ".bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(data)
        tmp.flush()
        return tmp.name, True
    finally:
        tmp.close()


def ensure_file_extracted(jfile: JuriaFile) -> None:
    if jfile.chunks and jfile.extracted_text:
        return
    if not jfile.file:
        return
    kind = (jfile.file_kind or "").lower()
    if kind not in ("pdf", "docx", "doc"):
        ext = (jfile.original_name or "").rsplit(".", 1)[-1].lower()
        kind = "pdf" if ext == "pdf" else "docx" if ext in ("docx", "doc") else ""
    if not kind:
        return
    tmp = False
    path = ""
    try:
        path, tmp = _local_path(jfile.file)
        pages = extract_document_pages(path, kind)
        chunks = []
        texts = []
        for page in pages:
            text = (page.get("text") or "").strip()
            if not text:
                continue
            texts.append(text)
            chunks.append(
                {
                    "page": page.get("page"),
                    "text": text[:4000],
                }
            )
        jfile.extracted_text = "\n\n".join(texts)
        jfile.page_count = len(pages) or None
        jfile.chunks = chunks
        if not texts:
            jfile.ocr_status = OcrStatus.REQUIRED
        else:
            jfile.ocr_status = OcrStatus.NOT_NEEDED
        jfile.save(update_fields=["extracted_text", "page_count", "chunks", "ocr_status"])
    except DocumentTextError:
        jfile.ocr_status = OcrStatus.REQUIRED
        jfile.save(update_fields=["ocr_status"])
    except Exception:
        logger.exception("Failed to extract JuriaFile %s", jfile.id)
        jfile.ocr_status = OcrStatus.FAILED
        jfile.save(update_fields=["ocr_status"])
    finally:
        if tmp and path and os.path.isfile(path):
            try:
                os.unlink(path)
            except OSError:
                pass


def _chunks_from_external(path: str, kind: str) -> list[dict[str, Any]]:
    try:
        pages = extract_document_pages(path, kind)
    except DocumentTextError:
        return []
    except Exception:
        logger.exception("Failed to extract external document")
        return []
    out = []
    for page in pages:
        text = (page.get("text") or "").strip()
        if text:
            out.append({"page": page.get("page"), "text": text[:4000]})
    return out


def authorized_source_rows(project: JuriaProject) -> list[JuriaProjectSource]:
    rows = list(
        project.sources.select_related(
            "case",
            "case_attachment",
            "library_document",
            "juria_file",
            "client",
        )
    )
    allowed: list[JuriaProjectSource] = []
    for row in rows:
        resource = {
            SourceKind.CASE: ResourceType.CASE,
            SourceKind.CASE_DOCUMENT: ResourceType.DOCUMENTS,
            SourceKind.UPLOAD: ResourceType.DOCUMENTS,
            SourceKind.LIBRARY: ResourceType.LIBRARY,
            SourceKind.LIBRARY_LOCAL: ResourceType.LIBRARY,
            SourceKind.LIBRARY_INTERNATIONAL: ResourceType.LIBRARY,
            SourceKind.CALENDAR: ResourceType.CALENDAR,
            SourceKind.TASKS: ResourceType.TASKS,
            SourceKind.CLIENT: ResourceType.CLIENTS,
            SourceKind.TEAM: ResourceType.TEAM,
        }.get(row.kind, ResourceType.DOCUMENTS)
        if has_resource_permission(project, resource, PermissionLevel.READ):
            allowed.append(row)
    return allowed


def retrieve_for_query(project: JuriaProject, query: str, *, limit: int = 8) -> list[dict[str, Any]]:
    """Return real retrieval hits. Empty list if nothing relevant is found."""
    tokens = set(_tokenize(query))
    hits: list[dict[str, Any]] = []
    for source in authorized_source_rows(project):
        chunks: list[dict[str, Any]] = []
        title = ""
        document_id = ""
        source_type = source.kind
        if source.kind == SourceKind.UPLOAD and source.juria_file_id:
            jfile = source.juria_file
            if not jfile or jfile.is_removed:
                continue
            ensure_file_extracted(jfile)
            chunks = jfile.chunks or []
            title = jfile.original_name
            document_id = str(jfile.id)
        elif source.kind == SourceKind.CASE_DOCUMENT and source.case_attachment_id:
            att = source.case_attachment
            if not att or not att.file:
                continue
            title = att.display_name()
            document_id = str(att.id)
            kind = "pdf" if title.lower().endswith(".pdf") else "docx"
            tmp = False
            path = ""
            try:
                path, tmp = _local_path(att.file)
                chunks = _chunks_from_external(path, kind)
            finally:
                if tmp and path and os.path.isfile(path):
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
        elif source.kind in (
            SourceKind.LIBRARY,
            SourceKind.LIBRARY_LOCAL,
            SourceKind.LIBRARY_INTERNATIONAL,
        ) and source.library_document_id:
            doc = source.library_document
            if not doc or not doc.file:
                continue
            title = doc.title or (doc.file.name.rsplit("/", 1)[-1] if doc.file else "")
            document_id = str(doc.id)
            kind = "pdf"
            name = (getattr(doc.file, "name", "") or title).lower()
            if name.endswith(".docx") or name.endswith(".doc"):
                kind = "docx"
            tmp = False
            path = ""
            try:
                path, tmp = _local_path(doc.file)
                chunks = _chunks_from_external(path, kind)
            except Exception:
                chunks = []
            finally:
                if tmp and path and os.path.isfile(path):
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
        else:
            continue

        for chunk in chunks:
            text = chunk.get("text") or ""
            score = _score(tokens, text)
            if score <= 0:
                continue
            hits.append(
                {
                    "document": title,
                    "document_id": document_id,
                    "source_type": source_type,
                    "source_id": str(source.id),
                    "page": chunk.get("page"),
                    "chunk": text[:1200],
                    "relevance": round(score, 4),
                    "metadata": {
                        "project_id": str(project.id),
                    },
                }
            )
    hits.sort(key=lambda h: h["relevance"], reverse=True)
    return hits[:limit]
