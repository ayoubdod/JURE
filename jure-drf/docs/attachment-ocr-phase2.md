# Case Attachment OCR — Phase 2

Server-side OCR for scanned case attachments using **OCRmyPDF** + **Tesseract**
(French, Arabic, English). Runs locally; documents are never sent to external OCR APIs.

## Architecture

1. On case attachment upload, a `CaseAttachmentIntelligence` row is created (1:1).
2. A background runner schedules `process_attachment_intelligence` (non-blocking).
3. The processor:
   - Copies the original to a private temp directory (original FileField untouched)
   - Analyses native text density per page (`pypdf`)
   - Skips OCR when all pages have sufficient text (`ocr_status=NOT_NEEDED`)
   - Runs OCRmyPDF with `--skip-text` for scanned / mixed PDFs
   - Stores metadata only (no full extracted text / no RAG chunks in Phase 2)
   - Optionally keeps a **derived** searchable PDF under `case_attachments_ocr/`
   - Deletes the temp directory

### Status machine (`ocr_status`)

| Status | Meaning |
|--------|---------|
| `PENDING` | Queued |
| `RUNNING` | Claimed by a worker (row lock) |
| `NOT_NEEDED` | Digital PDF / non-PDF |
| `REQUIRED` | Scanned, but OCR engine unavailable |
| `COMPLETED` | OCR finished |
| `FAILED` | Corrupt / limits / engine error (retryable) |

Concurrent duplicate jobs are prevented with `select_for_update` + `RUNNING` claim.

## Worker choice (no Celery)

This repo had **no** Celery/RQ/Huey worker. Redis is used for Channels only.

**Chosen approach (simplest production-compatible):**

| Mode | Setting | Use |
|------|---------|-----|
| Daemon thread | `ATTACHMENT_OCR_RUNNER=thread` (default) | Single Daphne process / local dev |
| Inline | `ATTACHMENT_OCR_RUNNER=sync` | Tests |
| Poller only | `ATTACHMENT_OCR_RUNNER=poll_only` | Production web + separate worker |

**Worker command:**

```bash
python manage.py process_case_attachment_intelligence --loop --interval 5 --limit 5
```

Do **not** introduce Celery+Redis for OCR unless you need multi-replica fan-out;
the DB-backed poller is enough for Phase 2 and matches Railway’s process model
(add a second service with the same image, different start command).

## Python dependencies

- `ocrmypdf` (see `pyproject.toml` / `requirements.txt`)
- Existing: `pypdf`, `Pillow`, `reportlab`

## System packages (Debian/Ubuntu / Docker)

```text
tesseract-ocr
tesseract-ocr-fra
tesseract-ocr-ara
tesseract-ocr-eng
ghostscript
qpdf
pngquant
unpaper
```

Already added to `jure-drf/Dockerfile`.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ATTACHMENT_OCR_RUNNER` | `thread` | `thread` \| `sync` \| `poll_only` |
| `ATTACHMENT_OCR_LANGUAGES` | `fra+ara+eng` | Tesseract languages |
| `ATTACHMENT_OCR_MAX_BYTES` | `52428800` (50 MiB) | Reject oversized files |
| `ATTACHMENT_OCR_MAX_PAGES` | `200` | Reject huge PDFs |
| `ATTACHMENT_OCR_TIMEOUT_SECONDS` | `300` | OCR subprocess timeout |
| `ATTACHMENT_OCR_MIN_CHARS_PER_PAGE` | `40` | Scanned-page threshold |
| `ATTACHMENT_OCR_KEEP_DERIVED` | `true` | Keep searchable OCR PDF |

Derived OCR files live under `MEDIA_ROOT` (must remain a persistent volume).

## Storage

- Originals: `MEDIA_ROOT/case_attachments/…` (unchanged)
- Derived OCR: `MEDIA_ROOT/case_attachments_ocr/…`
- Temp: OS temp dir, always cleaned after each job

## APIs (additive; upload/download contracts unchanged)

- `GET  /api/v1/cases/{id}/attachments/{attachment_id}/intelligence/`
- `POST /api/v1/cases/{id}/attachments/{attachment_id}/intelligence/retry/`
- `GET  /api/v1/cases/{id}/attachments/{attachment_id}/intelligence/derived/`

All are cabinet-scoped via the existing case ViewSet permissions.

## Security

- Cabinet isolation via case queryset / attachment filter
- Originals never overwritten
- Secure temp dirs + cleanup
- No document content in logs
- No external OCR transmission
- Derived files only via authenticated intelligence/derived endpoint

## Out of scope (later phases)

- Juria retrieval changes, embeddings, RAG chunks
- Frontend OCR UI
- Persisting full extracted text
