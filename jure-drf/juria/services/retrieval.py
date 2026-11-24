"""Project-scoped retrieval. Only authorized, explicitly connected sources are searched."""

from __future__ import annotations

import logging
import os
import re
import tempfile
from typing import Any

from django.conf import settings
from django.core.files.storage import default_storage

from juria.constants import OcrStatus, PermissionLevel, ResourceType, SourceKind
from juria.models import JuriaFile, JuriaProject, JuriaProjectSource
from juria.services.document_text import DocumentTextError, extract_document_pages
from juria.services.lexical import BM25Index, cosine_similarity, overlap_score, tokenize
from juria.services.permissions import has_resource_permission

logger = logging.getLogger(__name__)

CONTEXT_CATEGORY_CASE_DOCUMENTS = "case_documents"
CONTEXT_CATEGORY_LEGAL_KNOWLEDGE = "legal_knowledge"
CONTEXT_CATEGORY_OTHER = "other_firm_sources"


def _max_chunk_chars() -> int:
    return int(getattr(settings, "JURIA_RETRIEVAL_MAX_CHUNK_CHARS", 1200))


def _page_subchunk_chars() -> int:
    return int(getattr(settings, "JURIA_RETRIEVAL_PAGE_SUBCHUNK_CHARS", 2500))


def _retrieval_scorer() -> str:
    return str(getattr(settings, "JURIA_RETRIEVAL_SCORER", "bm25")).strip().lower()


def _tokenize(text: str) -> list[str]:
    """Public-compatible tokenizer used by tests / callers."""
    return tokenize(text, ocr_fold=True)


def _score(query_tokens: set[str], chunk_text: str) -> float:
    return overlap_score(query_tokens, chunk_text, ocr_fold=True)


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


def _split_long_page(text: str, *, page: int | None) -> list[dict[str, Any]]:
    """
    Subdivide long pages without dropping content silently.

    Splits on paragraph boundaries when possible; preserves original page number
    and ordered chunk_index. Never invents page numbers.
    """
    max_chars = _page_subchunk_chars()
    text = text or ""
    if len(text) <= max_chars:
        return [{"page": page, "text": text, "chunk_index": 0}]

    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[dict[str, Any]] = []
    buf: list[str] = []
    buf_len = 0
    idx = 0

    def flush():
        nonlocal idx, buf, buf_len
        if not buf:
            return
        chunks.append({"page": page, "text": "\n\n".join(buf).strip(), "chunk_index": idx})
        idx += 1
        buf = []
        buf_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(para) > max_chars:
            flush()
            # Hard-split oversized paragraphs on sentence-ish boundaries.
            start = 0
            while start < len(para):
                end = min(start + max_chars, len(para))
                if end < len(para):
                    cut = para.rfind(". ", start, end)
                    if cut > start + max_chars // 2:
                        end = cut + 1
                chunks.append(
                    {"page": page, "text": para[start:end].strip(), "chunk_index": idx}
                )
                idx += 1
                start = end
            continue
        if buf_len + len(para) + 2 > max_chars and buf:
            flush()
        buf.append(para)
        buf_len += len(para) + 2
    flush()
    return chunks or [{"page": page, "text": text[:max_chars], "chunk_index": 0}]


def _context_category(kind: str) -> str:
    if kind == SourceKind.CASE_DOCUMENT:
        return CONTEXT_CATEGORY_CASE_DOCUMENTS
    if kind in (
        SourceKind.LIBRARY,
        SourceKind.LIBRARY_LOCAL,
        SourceKind.LIBRARY_INTERNATIONAL,
    ):
        return CONTEXT_CATEGORY_LEGAL_KNOWLEDGE
    return CONTEXT_CATEGORY_OTHER


def _attachment_in_cabinet(att, cabinet_id: int | None) -> bool:
    if cabinet_id is None or att is None:
        return False
    case = getattr(att, "case", None)
    if case is not None and getattr(case, "cabinet_id", None) == cabinet_id:
        return True
    # Linked matters may expose the file; verify at least one linked case is same cabinet.
    try:
        return att.linked_cases.filter(cabinet_id=cabinet_id).exists()
    except Exception:
        return False


def _chunks_from_case_attachment(att) -> list[dict[str, Any]]:
    """
    Phase 4/5B: use persisted CaseAttachmentPage text when extraction is READY.

    Unextracted / failed OCR documents are excluded (no live re-OCR, no silent empty hits).
    """
    from cases.models import CaseAttachmentIntelligence

    try:
        intel = att.intelligence
    except CaseAttachmentIntelligence.DoesNotExist:
        return []
    except AttributeError:
        return []

    if intel.extraction_status != CaseAttachmentIntelligence.ExtractionStatus.READY:
        return []
    if intel.ocr_status == OcrStatus.FAILED:
        return []

    pages = list(intel.pages.order_by("page_number"))
    if not pages:
        return []

    out: list[dict[str, Any]] = []
    for page in pages:
        text = page.extracted_text or ""
        # Empty pages contribute no retrieval units (still preserved in DB for Phase 3).
        if not text.strip():
            continue
        for unit in _split_long_page(text, page=page.page_number):
            unit["extraction_method"] = page.extraction_method
            unit["page_pk"] = page.pk
            unit["embedding"] = page.embedding if isinstance(page.embedding, list) else None
            out.append(unit)
    return out


def authorized_source_rows(project: JuriaProject) -> list[JuriaProjectSource]:
    rows = list(
        project.sources.select_related(
            "case",
            "case_attachment",
            "case_attachment__case",
            "case_attachment__intelligence",
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
    if getattr(project, "is_simple", False):
        return []

    max_chunk = _max_chunk_chars()
    cabinet_id = getattr(project, "cabinet_id", None)
    candidates: list[dict[str, Any]] = []

    for source in authorized_source_rows(project):
        chunks: list[dict[str, Any]] = []
        title = ""
        document_id = ""
        source_type = source.kind
        case_id = None
        case_reference = ""
        extraction_note = ""

        if source.kind == SourceKind.UPLOAD and source.juria_file_id:
            jfile = source.juria_file
            if not jfile or jfile.is_removed:
                continue
            ensure_file_extracted(jfile)
            chunks = list(jfile.chunks or [])
            title = jfile.original_name
            document_id = str(jfile.id)

        elif source.kind == SourceKind.CASE_DOCUMENT and source.case_attachment_id:
            att = source.case_attachment
            if not att or not att.file:
                continue
            if not _attachment_in_cabinet(att, cabinet_id):
                continue
            # Explicit connection required (source row) + READY extraction only.
            chunks = _chunks_from_case_attachment(att)
            if not chunks:
                continue
            title = att.display_name()
            document_id = str(att.id)
            case_obj = getattr(att, "case", None) or getattr(source, "case", None)
            if case_obj is not None:
                case_id = case_obj.id
                case_reference = getattr(case_obj, "reference", "") or ""
            try:
                if att.intelligence and att.intelligence.is_scanned:
                    extraction_note = "OCR"
            except Exception:
                extraction_note = ""

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

        category = _context_category(source_type)
        for chunk in chunks:
            text = chunk.get("text") or ""
            if not text.strip():
                continue
            page = chunk.get("page")
            citation = title or "Document"
            if page:
                citation = f"{citation}, page {page}"
            candidates.append(
                {
                    "document": title,
                    "document_id": document_id,
                    "source_type": source_type,
                    "source_id": str(source.id),
                    "page": page,
                    "chunk": text[:max_chunk],
                    "citation_label": citation,
                    "embedding": chunk.get("embedding"),
                    "metadata": {
                        "project_id": str(project.id),
                        "cabinet_id": cabinet_id,
                        "case_id": case_id,
                        "case_reference": case_reference,
                        "attachment_id": int(document_id)
                        if source_type == SourceKind.CASE_DOCUMENT and str(document_id).isdigit()
                        else None,
                        "extraction_method": chunk.get("extraction_method"),
                        "extraction_note": extraction_note,
                        "context_category": category,
                        "chunk_index": chunk.get("chunk_index", 0),
                        "page_pk": chunk.get("page_pk"),
                    },
                }
            )

    if not candidates:
        return []

    scored = _score_candidates(query, candidates)
    # Deduplicate near-identical passages (same doc + page + leading text).
    deduped: list[dict[str, Any]] = []
    seen: set[tuple] = set()
    for hit in scored:
        if hit.get("relevance", 0) <= 0:
            continue
        key = (
            hit.get("document_id"),
            hit.get("page"),
            (hit.get("chunk") or "")[:160],
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(hit)
        if len(deduped) >= limit:
            break
    return deduped


def _score_candidates(query: str, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Phase 5B scoring:
    - default: BM25 over candidate corpus (OCR-aware tokenization)
    - optional: hybrid = 0.65*BM25_norm + 0.35*embedding_cosine when enabled
    - fallback: token overlap if scorer=overlap
    """
    scorer = _retrieval_scorer()
    texts = [c.get("chunk") or "" for c in candidates]

    if scorer == "overlap":
        q_tokens = set(tokenize(query, ocr_fold=True))
        for c in candidates:
            c["relevance"] = round(_score(q_tokens, c.get("chunk") or ""), 4)
            c["metadata"]["scorer"] = "overlap"
        candidates.sort(key=lambda h: h["relevance"], reverse=True)
        return candidates

    index = BM25Index.build(texts, ocr_fold=True)
    bm25_scores = index.scores(query, ocr_fold=True)

    use_hybrid = False
    emb_scores = [0.0] * len(candidates)
    try:
        from juria.services.embeddings import get_embedding_provider, hybrid_enabled

        if hybrid_enabled():
            provider = get_embedding_provider()
            q_vec = provider.embed_query(query)
            for i, c in enumerate(candidates):
                vec = c.get("embedding")
                if isinstance(vec, list) and len(vec) > 0:
                    emb_scores[i] = max(0.0, cosine_similarity(q_vec, [float(x) for x in vec]))
            use_hybrid = any(s > 0 for s in emb_scores) or any(
                isinstance(c.get("embedding"), list) and c.get("embedding") for c in candidates
            )
    except Exception:
        logger.exception("Hybrid embedding scoring failed; falling back to BM25")
        use_hybrid = False

    max_bm25 = max(bm25_scores) if bm25_scores else 0.0
    max_emb = max(emb_scores) if emb_scores else 0.0

    for i, c in enumerate(candidates):
        bm25 = bm25_scores[i]
        if use_hybrid:
            bm25_n = (bm25 / max_bm25) if max_bm25 > 0 else 0.0
            emb_n = (emb_scores[i] / max_emb) if max_emb > 0 else 0.0
            # Prefer BM25 for exact legal terms; embeddings lift paraphrase/synonym.
            score = 0.65 * bm25_n + 0.35 * emb_n
            c["metadata"]["scorer"] = "hybrid_bm25_embedding"
            c["metadata"]["bm25"] = round(bm25, 4)
            c["metadata"]["embedding_score"] = round(emb_scores[i], 4)
        else:
            score = bm25
            c["metadata"]["scorer"] = "bm25"
        c["relevance"] = round(float(score), 4)
        # Drop embedding payload from response (keep citations only).
        c.pop("embedding", None)

    candidates.sort(key=lambda h: h["relevance"], reverse=True)
    return candidates
