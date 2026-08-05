# Knowledge Hub — Step-by-Step AI Integration Guide

This guide explains how to turn the current **Knowledge Hub UI** into a **real AI-operated legal knowledge system**.

The frontend redesign is already in place. Today, AI signals (scores, entities, risk, semantic search examples, Copilot panel) are **client-side heuristics** derived from title, description, tags, and category. This document is the roadmap to replace those heuristics with production AI — **without breaking existing Library APIs**.

---

## Current state (what you already have)

| Layer | Status |
| --- | --- |
| UI: Knowledge Hub layout, search, metrics, views, Copilot | Done |
| CRUD: `GET/POST/PATCH/DELETE /library/documents/` | Done |
| Juria chat / drafting | Done (separate from Library) |
| Document text extraction / OCR | Not wired |
| Embeddings + vector search | Not wired |
| Real summaries / entities / clauses / risk | Not wired |
| Knowledge graph from citations | Not wired |

**Frontend entry points to replace later:**

- `jure-frontend/src/components/library/knowledge-hub/knowledgeUtils.ts` — fake insights + local filter
- `jure-frontend/src/pages/Library.tsx` — calls `semanticFilter` / `enrichDocuments`
- `jure-frontend/src/services/library/api.ts` — add new AI endpoints here

**Backend Library model today** (`jure-drf/library/models.py`): title, category, tags, description, file, size, cabinet, created_by.

---

## Guiding principles

1. **Do not break** existing document CRUD contracts.
2. **Extend** the Document model (or a related `DocumentIntelligence` table) — do not reinvent upload.
3. Process AI work **asynchronously** (Celery / RQ / Dramatiq) after upload.
4. Keep the Copilot UI; **swap data source** from heuristics → API.
5. Prefer **Juria** (or your existing LLM vendor) as the generation layer; use a **vector DB** for retrieval.
6. Respect **cabinet tenancy** and RBAC on every AI endpoint.

---

## Architecture (target)

```
Upload / Update document
        │
        ▼
Library Document (existing)
        │
        ▼
Ingestion job (async)
  ├─ Extract text (PDF/DOCX) + OCR if needed
  ├─ Chunk text
  ├─ Embed chunks → Vector store
  ├─ LLM: summary, entities, clauses, risk, tags, language
  └─ Persist DocumentIntelligence + index status
        │
        ▼
Knowledge Hub APIs
  ├─ GET  /library/documents/{id}/intelligence/
  ├─ POST /library/knowledge/search/     (NL / semantic)
  ├─ POST /library/documents/{id}/ask/
  ├─ POST /library/documents/compare/
  └─ GET  /library/knowledge/graph/
        │
        ▼
Frontend Knowledge Hub (replace heuristics)
```

---

## Phase 0 — Inventory & decisions (1–2 days)

### Step 0.1 — Choose stack

Decide and write down:

| Concern | Options (pick one) |
| --- | --- |
| LLM | Juria API (already in repo) / OpenAI / Azure OpenAI / Anthropic |
| Embeddings | `text-embedding-3-small` / Voyage / local `bge-m3` |
| Vector store | pgvector (Postgres) / Qdrant / Pinecone |
| Queue | Celery + Redis (recommended if already used) |
| OCR | Tesseract / Azure Document Intelligence / AWS Textract |
| Parsers | `pypdf` + `python-docx` (+ optional Unstructured) |

### Step 0.2 — Define success criteria

Minimum viable AI Library:

1. Upload PDF → text extracted → `ai_indexed = true`
2. Natural-language search returns relevant docs (not just title match)
3. Selecting a doc shows a **real** summary + tags from the backend
4. Failures are visible (`ocr_status`, `index_status`, error message)

---

## Phase 1 — Data model (backend)

### Step 1.1 — Add intelligence fields

Create a related model (preferred over stuffing everything into `Document`):

```python
# library/models.py (concept)

class DocumentIntelligence(models.Model):
    document = models.OneToOneField("library.Document", on_delete=models.CASCADE, related_name="intelligence")

    # Pipeline
    index_status = models.CharField(max_length=32, default="pending")  # pending|processing|indexed|failed
    ocr_status = models.CharField(max_length=32, default="not_needed")  # not_needed|pending|done|failed
    language = models.CharField(max_length=8, blank=True)
    confidence = models.FloatField(default=0)  # 0–100
    knowledge_score = models.FloatField(default=0)
    risk_level = models.CharField(max_length=16, default="low")  # low|medium|high
    error_message = models.TextField(blank=True)

    # AI outputs
    summary = models.TextField(blank=True)
    entities = models.JSONField(default=dict)      # {people:[], companies:[], dates:[]}
    key_clauses = models.JSONField(default=list)
    smart_tags = models.JSONField(default=list)
    suggested_actions = models.JSONField(default=list)
    deadlines = models.JSONField(default=list)
    risks = models.JSONField(default=list)

    # Retrieval helpers
    extracted_text = models.TextField(blank=True)  # or store only in object storage
    chunk_count = models.PositiveIntegerField(default=0)
    last_indexed_at = models.DateTimeField(null=True, blank=True)

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
```

Optional chunk table for pgvector:

```python
class DocumentChunk(models.Model):
    document = models.ForeignKey("library.Document", on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    embedding = VectorField(dimensions=1536)  # if using pgvector
    token_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict)
```

### Step 1.2 — Migration

```bash
cd jure-drf
python manage.py makemigrations library
python manage.py migrate
```

### Step 1.3 — Extend serializer (non-breaking)

Include intelligence as a nested read-only object on `Document` responses so the Hub can hydrate in one call:

```json
{
  "id": 12,
  "title": "NDA Microsoft",
  "category": "contracts",
  "tags": ["nda"],
  "description": "...",
  "file": "...",
  "size": 102400,
  "created": "...",
  "modified": "...",
  "intelligence": {
    "index_status": "indexed",
    "ai_indexed": true,
    "confidence": 91,
    "knowledge_score": 88,
    "risk_level": "medium",
    "language": "EN",
    "summary": "...",
    "entities": { "people": [], "companies": ["Microsoft Inc."], "dates": [] },
    "key_clauses": ["Confidentiality", "Governing law"],
    "smart_tags": ["NDA", "AI-indexed"],
    "suggested_actions": ["Extract key clauses"],
    "references": 3
  }
}
```

Keep old clients working: if `intelligence` is missing, frontend falls back to heuristics (already the case).

---

## Phase 2 — Ingestion pipeline (backend)

### Step 2.1 — Trigger on create/update

In `library/views.py` (or signals):

- After successful `Document` create → enqueue `index_document(document_id)`
- After file replace on update → re-enqueue
- Metadata-only update → optionally skip re-embed; refresh LLM tags if title/description changed

### Step 2.2 — Job steps (implement in order)

**Job A — Extract text**

1. Detect MIME / extension
2. PDF → text layer; if empty pages → OCR
3. DOCX → paragraph extract
4. Images → OCR
5. Save `extracted_text` + `ocr_status`

**Job B — Chunk**

1. Split ~500–800 tokens with ~10% overlap
2. Keep page/section metadata when possible
3. Save `DocumentChunk` rows

**Job C — Embed**

1. Batch embed chunks
2. Upsert vectors (pgvector / Qdrant)
3. Set `chunk_count`

**Job D — Enrich with LLM**

Prompt the model with the extracted text (or a condensed map-reduce of chunks) to return JSON:

```json
{
  "summary": "...",
  "language": "FR",
  "confidence": 87,
  "knowledge_score": 82,
  "risk_level": "medium",
  "entities": { "people": [], "companies": [], "dates": [] },
  "key_clauses": [],
  "smart_tags": [],
  "suggested_actions": [],
  "deadlines": [],
  "risks": []
}
```

Validate JSON strictly. Store on `DocumentIntelligence`. Set `index_status = indexed`.

**Job E — Failure handling**

- Catch errors → `index_status = failed`, store `error_message`
- Allow manual “Re-index” endpoint

### Step 2.3 — Security & cost controls

- Never send documents outside the firm’s approved LLM region/vendor without policy approval
- Truncate prompts; summarize long docs in map-reduce
- Rate-limit per cabinet
- Redact secrets if present (API keys, passwords) before LLM calls

---

## Phase 3 — AI APIs (backend)

Add routes under `/library/` (or `/library/knowledge/`). Suggested contract:

### Step 3.1 — Get intelligence

`GET /library/documents/{id}/intelligence/`

Returns the nested intelligence object. 404 if not ready; include `index_status` so UI can show skeletons.

### Step 3.2 — Semantic / NL search

`POST /library/knowledge/search/`

```json
{
  "query": "Find all NDAs signed with Microsoft",
  "collection": "contracts",
  "limit": 20,
  "filters": { "risk_level": ["high", "medium"] }
}
```

Server flow:

1. Embed query
2. Vector similarity search scoped to user’s cabinet
3. Optional LLM re-rank / answer synthesis
4. Return documents + `score` + short `why_matched`

Response:

```json
{
  "answer": "Found 3 NDAs mentioning Microsoft…",
  "results": [
    { "document_id": 12, "score": 0.86, "snippet": "…", "why_matched": "Company entity Microsoft" }
  ]
}
```

### Step 3.3 — Ask about one document

`POST /library/documents/{id}/ask/`

```json
{ "question": "Who signed this agreement?" }
```

RAG over that document’s chunks only.

### Step 3.4 — Compare / duplicates

`POST /library/documents/compare/` → `{ "left_id": 1, "right_id": 2 }`  
`POST /library/knowledge/duplicates/` → near-duplicate clusters by embedding distance

### Step 3.5 — Graph

`GET /library/knowledge/graph/?collection=all`

Return nodes (docs, entities) + edges (shares entity, cites, same matter). Start simple: same company entity / shared tags.

### Step 3.6 — Re-index

`POST /library/documents/{id}/reindex/` — staff / owner only

---

## Phase 4 — Frontend wiring (Knowledge Hub)

### Step 4.1 — Types

Update `jure-frontend/src/services/library/typing.d.ts`:

```ts
type DocumentIntelligence = {
  index_status: 'pending' | 'processing' | 'indexed' | 'failed';
  ai_indexed: boolean;
  confidence: number;
  knowledge_score: number;
  risk_level: 'low' | 'medium' | 'high';
  language: string;
  summary: string;
  entities: { people: string[]; companies: string[]; dates: string[] };
  key_clauses: string[];
  smart_tags: string[];
  suggested_actions: string[];
  deadlines?: string[];
  risks?: string[];
  references?: number;
  ocr_status?: string;
};

type Document = {
  // existing fields…
  intelligence?: DocumentIntelligence | null;
};
```

### Step 4.2 — API client

In `services/library/api.ts` add:

```ts
apiSearchKnowledge(payload)
apiGetDocumentIntelligence(id)
apiAskDocument(id, question)
apiCompareDocuments(leftId, rightId)
apiReindexDocument(id)
apiGetKnowledgeGraph(params)
```

### Step 4.3 — Replace heuristics gradually

| Function today | Replace with |
| --- | --- |
| `buildInsight(doc)` | Prefer `doc.intelligence`; fallback to heuristic if null |
| `semanticFilter(...)` | Call `apiSearchKnowledge` when query length ≥ 3; debounce 300ms |
| Copilot panel fields | Bind to `intelligence` from selected doc / fetch detail |
| Metrics `aiIndexed` | Count `intelligence.ai_indexed` / `index_status === 'indexed'` |
| Knowledge Graph view | Fetch `apiGetKnowledgeGraph` |
| Suggested actions buttons | Call real endpoints (ask / reindex / compare) |

Recommended helper:

```ts
export function resolveInsight(doc: API.Document): KnowledgeInsight {
  if (doc.intelligence?.index_status === 'indexed') {
    return mapIntelligenceToInsight(doc.intelligence);
  }
  return buildInsight(doc); // keep current heuristic as fallback
}
```

### Step 4.4 — Search UX

In `KnowledgeSearch.tsx` / `Library.tsx`:

1. Debounce query
2. Show loading state in results area
3. If API returns `answer`, show a one-line AI answer above the grid
4. Keep example chips — they become real queries

### Step 4.5 — Indexing UX

- Badge: `Indexing…` / `AI Indexed` / `Failed`
- Empty Copilot while `processing`
- Toast on `failed` with “Retry index” → `apiReindexDocument`

### Step 4.6 — Feature flags

Gate new calls behind something like `VITE_KNOWLEDGE_AI_ENABLED=true` so you can ship UI now and flip AI on per environment.

---

## Phase 5 — Feature checklist (implement in this order)

Ship value early; do not build everything at once.

| # | Feature | Depends on | UI surface |
| --- | --- | --- | --- |
| 1 | Text extraction + index status | Phase 1–2 | Badges, metrics |
| 2 | Auto summary + language | Job D | Copilot + cards |
| 3 | Smart tags + folder suggestion | Job D | Copilot, collections |
| 4 | Semantic / NL search | Embeddings | Search bar |
| 5 | Entities + dates | Job D | Copilot |
| 6 | Clause extraction | Job D / ask | Copilot + AI View |
| 7 | Risk detection | Job D | Risk chip, watchlist |
| 8 | Ask-this-document | RAG | Copilot actions |
| 9 | Similar / duplicates | Embeddings | AI View |
| 10 | Compare two docs | LLM | AI View / modal |
| 11 | OCR status | Job A | Card badge |
| 12 | Translation | LLM | Action |
| 13 | Knowledge graph | Entities | Graph tab |
| 14 | Citations / references | Graph + regex | Copilot |
| 15 | Version intelligence | File hash lineage | Timeline |

---

## Phase 6 — Testing

### Backend

- Unit: extractor for sample PDF/DOCX
- Unit: chunker token bounds
- Integration: upload → job → `index_status=indexed`
- Search: query “NDA Microsoft” returns the seeded NDA first
- Tenancy: user A never sees user B cabinet vectors
- Failure: corrupt PDF → `failed` + message

### Frontend

- Document without intelligence still renders (heuristic fallback)
- Search debounce / cancel in-flight requests
- Copilot keyboard + screen reader labels remain intact
- Reduced motion still respected

### Eval set (legal)

Build a small golden set (20–50 docs) with expected answers for:

- “contracts expiring next quarter”
- “clauses about arbitration”
- “files that reference GDPR”

Track precision@5 and human “useful?” scores before calling it production-ready.

---

## Phase 7 — Rollout

1. **Dev**: flag on, one cabinet, sample docs  
2. **Staging**: real firm sample (anonymized), cost monitoring  
3. **Prod pilot**: one team, reindex existing library in batches overnight  
4. **GA**: enable flag globally; keep heuristic fallback for 1 release  

Batch reindex:

```text
POST /library/knowledge/reindex-all/   # admin only, paginated / queued
```

---

## Concrete first sprint (recommended)

If you only have one sprint, do this:

1. `DocumentIntelligence` model + migration + nested serializer field  
2. Celery task: extract text + save summary via Juria/LLM (no vectors yet)  
3. `GET …/intelligence/` + include on list/detail  
4. Frontend: `resolveInsight()` prefers API intelligence  
5. Show `Indexing…` / `AI Indexed` badges from `index_status`  
6. Next sprint: embeddings + `POST /library/knowledge/search/`

That alone makes the Library feel AI-operated; search quality comes right after.

---

## File map (where to work)

### Backend

- `jure-drf/library/models.py` — intelligence + chunks  
- `jure-drf/library/serializers.py` — nest intelligence  
- `jure-drf/library/views.py` / new `intelligence_views.py` — endpoints  
- `jure-drf/library/urls.py` — routes  
- `jure-drf/library/tasks.py` — async pipeline (new)  
- `jure-drf/juria/services/juria_api_service.py` — reuse for LLM if desired  

### Frontend

- `jure-frontend/src/services/library/api.ts` — new clients  
- `jure-frontend/src/services/library/typing.d.ts` — types  
- `jure-frontend/src/components/library/knowledge-hub/knowledgeUtils.ts` — `resolveInsight`  
- `jure-frontend/src/pages/Library.tsx` — wire search API  
- `jure-frontend/src/components/library/knowledge-hub/AICopilotPanel.tsx` — live data  
- `jure-frontend/src/components/library/knowledge-hub/KnowledgeSearch.tsx` — loading / answer  

---

## Definition of done

The Library is “AI-operated” when:

1. New uploads become searchable by meaning within a few minutes  
2. Copilot summary/entities/risk come from the server, not keyword guesses  
3. “Ask anything about your firm's knowledge…” hits a retrieval API  
4. Index failures are visible and recoverable  
5. Existing CRUD and non-AI clients keep working  

---

## Related docs

- Frontend document update issues: `BACKEND_DOCUMENT_UPDATE_ISSUE.md` (fix PATCH before relying on re-upload reindex)  
- Knowledge Hub UI lives under: `src/components/library/knowledge-hub/`  
- Page orchestrator: `src/pages/Library.tsx`
