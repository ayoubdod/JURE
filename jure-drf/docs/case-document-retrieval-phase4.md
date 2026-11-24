# Case Document Retrieval — Phase 4

Integrates Phase 3 `CaseAttachmentPage` text into Juria’s existing keyword retrieval
and context engine. No embeddings / pgvector.

## Integration points

1. `juria/services/retrieval.py` — `CASE_DOCUMENT` sources load READY pages only
2. `juria/services/context_engine.py` — categorized retrieved block + citations
3. `juria/services/juria_api_service.py` — evidence / citation / injection rules
4. Existing `JuriaProjectSource` + `connect_case_documents` (explicit connect required)

## Retrieval rules

- Only explicitly connected `CASE_DOCUMENT` sources
- Only `extraction_status=READY` (failed/pending excluded)
- Cabinet isolation on attachment.case / linked_cases
- `is_simple` → empty retrieval
- Preserves UPLOAD (JuriaFile) and LIBRARY paths

## Citations

Hits include `citation_label` from metadata (`Document.pdf, page N`). Context wraps
passages in `<<<UNTRUSTED_DOCUMENT_CONTENT>>>` and instructs the model to cite `[n]`.

## Keyword benchmark (deterministic fixtures)

See `KeywordRetrievalBenchmarkTests` — floors: Recall@5/8 ≥ 0.8, Precision@5 ≥ 0.4.

## Phase 5 (needs approval)

If production recall drops on noisy OCR / synonyms, consider embeddings — not started here.
