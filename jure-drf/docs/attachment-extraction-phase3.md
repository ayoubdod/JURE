# Case Attachment Text Extraction — Phase 3

Persists page-aware extracted text for case attachments after Phase 2 OCR.

## Storage trade-off

**Chosen: PostgreSQL `CaseAttachmentPage.extracted_text` (TextField).**

| Approach | Pros | Cons |
|----------|------|------|
| PostgreSQL pages (chosen) | Atomic with intelligence metadata; simple authorized queries; matches `JuriaFile.extracted_text`; ready for Phase 4 retrieval | Very large corpora inflate DB backups |
| Private file storage | Better for multi-thousand-page dumps | Weaker atomicity; harder pagination; extra ACL surface |

Typical legal PDFs are well within PG comfort. Caps: `ATTACHMENT_EXTRACTION_MAX_CHARS_PER_PAGE` / `ATTACHMENT_EXTRACTION_MAX_TOTAL_CHARS`.

## Extraction strategy

1. Analyse original PDF (native text density) — Phase 2 analyzer.
2. OCR scanned/mixed pages → derived OCR PDF (unchanged originals).
3. Extract per page:
   - **NATIVE** from original when the page has sufficient digital text
   - **OCR** from derived PDF for scanned pages
4. Persist `CaseAttachmentPage` rows; set `extraction_status=READY`.
5. Reuses `juria.services.document_text.extract_document_pages` (pypdf).

`confidence_score` stays **NULL** (OCRmyPDF path does not expose per-page confidence).

## Status coordination

| Case | OCR | Extraction |
|------|-----|------------|
| Digital PDF | `NOT_NEEDED` | `READY` |
| Scanned OK | `COMPLETED` | `READY` |
| OCR failure | `FAILED` | `FAILED` |
| Extraction failure | may stay `COMPLETED`/`NOT_NEEDED` | `FAILED` |

## APIs

- `GET  .../attachments/{id}/intelligence/` — metadata (no full text)
- `GET  .../attachments/{id}/intelligence/pages/?page=&page_size=&offset=`
- `POST .../attachments/{id}/intelligence/retry/`
- `POST .../attachments/{id}/intelligence/reprocess/` — force; clears obsolete pages

## Worker

Unchanged: `python manage.py process_case_attachment_intelligence --loop`

## Out of scope

RAG, embeddings, retrieval changes, frontend, reprocessing all historical attachments.
