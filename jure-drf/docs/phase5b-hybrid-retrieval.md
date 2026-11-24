# Phase 5B — BM25 + optional local hybrid embeddings

Implements the Phase 5A **CONDITIONAL_GO** plan.

## What shipped

### 5B-1 — Production BM25 (default)
- `JURIA_RETRIEVAL_SCORER=bm25` (default)
- OCR-aware tokenization (French scan noise folding + Arabic normalization)
- Scores the full candidate corpus with BM25 (not set-overlap alone)
- Fallback: `JURIA_RETRIEVAL_SCORER=overlap` restores Phase 4 behaviour

### 5B-2 — Optional hybrid (flagged off)
- `JURIA_EMBEDDINGS_ENABLED` + `JURIA_HYBRID_RETRIEVAL` must both be True
- Local providers only (`sentence_transformers` or `hash` stub)
- **No external embedding APIs**
- Vectors stored as JSON on `CaseAttachmentPage` (no pgvector required for pilot)
- Merge: `0.65 * BM25_norm + 0.35 * cosine`
- Index on extraction READY (when enabled) or:

```bash
python manage.py embed_case_attachment_pages --limit 100
```

## Enable real multilingual embeddings

```bash
pip install sentence-transformers
# or poetry add sentence-transformers
```

```env
JURIA_EMBEDDINGS_ENABLED=True
JURIA_HYBRID_RETRIEVAL=True
JURIA_EMBEDDING_BACKEND=sentence_transformers
JURIA_EMBEDDING_MODEL=intfloat/multilingual-e5-base
```

Then migrate + embed existing READY pages. Documents never leave your infrastructure.

## Privacy
- Embeddings generated on-box
- Case text is not sent to third-party embedding vendors
- Privacy Gateway for LLM egress unchanged

## Migration
`0016_caseattachmentpage_embedding.py`
