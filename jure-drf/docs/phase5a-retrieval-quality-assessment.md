# Phase 5A — Advanced Retrieval Quality Assessment

**Status:** Evaluation only. Production retrieval unchanged. No embeddings / pgvector installed.

## 1. Current algorithm (audit)

`retrieve_for_query` (`juria/services/retrieval.py`):

1. Authorize explicitly connected `JuriaProjectSource` rows.
2. For `CASE_DOCUMENT`: load READY `CaseAttachmentPage` text (Phase 3/4).
3. Tokenize query/document with multilingual regex (Latin + Arabic).
4. Score = `|query_tokens ∩ doc_tokens| / |query_tokens|`.
5. Sort, dedupe, return top‑k with citation metadata.

**Limitations**

| Limitation | Impact |
|------------|--------|
| Pure set-overlap | No TF/IDF or term rarity weighting |
| Synonym blind | “mettre fin au contrat” ≠ “résiliation” |
| Paraphrase blind | Natural questions miss exact clause wording |
| OCR noise | Garbled tokens fail exact match |
| No semantic space | Cannot match meaning across FR/AR/EN paraphrases |
| Stopword lists | Heuristic; legal articles/numbers handled but incomplete |

Phase 4 fixture (5 exact-ish queries) reported Recall@5 ≥ 0.8 — **optimistic** vs real lawyer questions.

## 2. Benchmark dataset

Synthetic corpus `jure_legal_retrieval_v1` in `juria/benchmarks/dataset.py`:

- **24 passages**, **28 queries**
- Languages: FR / AR / EN
- Domains: contract, litigation, employment, corporate, regulatory
- Query types A–H: exact, synonym, paraphrase, natural, incomplete, multi_doc, noisy_ocr, multi_page
- No client data; anonymized/synthetic only

Offline rankers (isolated; do not touch production):

| Ranker | Role |
|--------|------|
| `token_overlap_phase4` | Production-equivalent |
| `bm25_improved_lexical` | BM25 + OCR folding + Arabic normalization |
| `hybrid_lexical_synonym_proxy` | BM25 ⊕ synonym expansion (semantic *proxy* only) |

## 3. Results (measured)

| Metric | Token overlap (Phase 4) | BM25 lexical | Hybrid synonym proxy |
|--------|-------------------------|--------------|----------------------|
| Recall@5 | **0.821** | **0.857** | **0.857** |
| Recall@8 | 0.821 | 0.857 | 0.857 |
| Precision@5 | 0.566 | 0.527 | 0.464 |
| MRR | 0.821 | 0.792 | 0.798 |
| nDCG@5 | 0.811 | 0.804 | 0.809 |
| Correct doc@5 | 0.929 | 0.929 | 0.929 |
| Correct page@5 | 0.857 | 0.857 | 0.857 |

### By query type (Recall@5)

| Type | Token overlap | BM25 | Hybrid proxy |
|------|---------------|------|--------------|
| Exact | 1.00 | 1.00 | 1.00 |
| Incomplete | 1.00 | 1.00 | 1.00 |
| Natural | 1.00 | 1.00 | 1.00 |
| Multi-doc / multi-page | 1.00 | 1.00 | 1.00 |
| Noisy OCR | **0.50** | **1.00** | **1.00** |
| Paraphrase | **0.60** | **0.60** | **0.60** |
| Synonym | **0.50** | **0.50** | **0.50** |

**Vs Phase 4 fixture:** overall Recall@5 stays ≥ 0.8, but the expanded suite exposes synonym/paraphrase failure that the Phase 4 floor hid.

## 4. Approach evaluation

### A. Existing token-overlap
Strong on exact/legal keywords and article-like queries. Weak on synonym, paraphrase, OCR.

### B. Improved lexical (BM25)
+3.6 pts overall Recall@5; **fixes noisy OCR** (0.5 → 1.0). Does **not** fix synonym/paraphrase. Low infra cost; no new data residency issues.

### C. Hybrid (keyword + semantic)
Synonym-expansion proxy did **not** close the paraphrase/synonym gap (still 0.5–0.6). True multilingual embeddings are required to test semantic benefit — **not implemented in 5A**.

## 5. Embedding cost & architecture (evaluation only)

| Option | Privacy | Fit |
|--------|---------|-----|
| **Local `multilingual-e5-base` / `bge-m3`** | Documents stay in VPC | Preferred if Phase 5B approved |
| External embedding APIs | Egress of case text | **Not recommended** under Privacy Gateway posture |

- **Storage:** ~1–4 KB/chunk + ANN/HNSW; ~6 MB raw vectors per ~1k pages (e5-base ballpark)
- **Indexing:** on READY extraction / reprocess; re-embed on model bump
- **Query:** local inference 10–50 ms + BM25 merge; keep keyword path for exact articles
- **Residency:** colocate model with Postgres/MEDIA; never send raw client PDFs to third parties for embedding

## 6. Security

- Synthetic corpus only
- Production auth / cabinet / Privacy Gateway untouched
- No export of confidential documents
- Citations remain page-level metadata contracts from Phase 4

## 7. Decision

### Recommendation: **CONDITIONAL_GO** (for a Phase 5B hybrid *pilot*)

**Not** an unconditional production embeddings rollout.

**Phased plan (requires explicit approval before any coding):**

1. **5B-1 (optional quick win):** Production BM25 (+ OCR fold) — high ROI for scanned docs, no vectors.
2. **5B-2 (pilot):** Local multilingual embeddings on READY pages only; hybrid rank = BM25 ∪ vector; evaluate on this suite + anonymized real queries.
3. **GO to full hybrid** only if pilot lifts synonym/paraphrase Recall@5 by ≥ +0.2 without harming exact-term Precision.

### NO-GO for
- External embedding APIs for case documents
- Replacing keyword retrieval entirely
- Installing pgvector in this phase

## 8. Artifacts

- `juria/benchmarks/` — dataset, metrics, rankers, runner
- `juria/benchmarks/phase5a_results.json` — machine-readable results
- `juria/tests_phase5a_retrieval_benchmark.py` — 2 tests, passing

**STOP.** Await approval before Phase 5B implementation.
