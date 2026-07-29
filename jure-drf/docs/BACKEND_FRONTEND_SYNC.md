# Backend–Frontend sync: when backend changes affect the frontend

When backend changes can affect the frontend, create a **frontend prompt** so the frontend team (or Cursor) can verify or update the implementation.

---

## When to create a frontend prompt

**Always** create a prompt when you change:

- API endpoints, request/response format, or status codes
- Response field names, types, or structure
- Ordering or pagination of list endpoints
- Auth, permissions, or error responses
- Any behavior the frontend depends on

---

## Process

1. **Backend change** – Add/modify API endpoints, request/response formats, or behavior.
2. **Create a frontend prompt** – Add a doc under `docs/` (e.g. `docs/FRONTEND_<FEATURE>.md`).
3. **Share the prompt** – Use it in Cursor, in a ticket, or in team chat.

---

## Template for frontend prompts

```markdown
# Frontend: [Feature name] (for Cursor / frontend team)

**Context:** [What changed on the backend and why]

**Goal:** [What the frontend should do or verify]

---

## 1. API changes

- **Endpoint:** `METHOD /path/`
- **Request:** [Body format, headers, auth]
- **Response:** [Structure, status codes]

---

## 2. Frontend checklist

- [ ] [Specific thing to verify or implement]
- [ ] [Another item]
- [ ] [Error handling, loading states, etc.]

---

## 3. Example code (optional)

[Minimal example: fetch/axios call, form handling, etc.]

---

## 4. Edge cases / notes

[Cache busting, permissions, backward compatibility, etc.]
```

---

## Existing frontend prompts

| Doc | Feature |
|-----|---------|
| `FRONTEND_CABINET_LOGO_UPDATE.md` | Cabinet logo update |
| `FRONTEND_SETUP_PASSWORD_PAGE.md` | Setup password page (invitation flow) |
| `FRONTEND_FORGOT_PASSWORD.md` | Forgot password flow |
| `FRONTEND_RESEND_INVITATION.md` | Resend invitation to team member |
| `FRONTEND_CHAT_CONVERSATION_LIST.md` | Chat: order, display_name, unread, archive, pin, delete |
| `FRONTEND_FINANCE_MODULE.md` | Finance: fees, invoices, payments, tax advance, dashboard; OWNER/ADMIN only |
| `FRONTEND_CASE_FEE_HONORAIRE.md` | Case fee POST: `planned_amount`, `lawyer_id` = User.pk, route under `/cases/<id>/fees/` |
| `FRONTEND_CASE_INVOICE_CREATE.md` | POST `/cases/<id>/invoices/`: champs exacts, 400/403/404, exemples JSON |
| `FRONTEND_BACKEND_CONNECTION.md` | Env, `/api/v1/`, auth, CORS, smoke tests, WebSockets — stay connected to API |
| `FRONTEND_TVA_AND_FINANCE_UPDATES.md` | TVA Art.89: `tva_status` on dashboard, `GET /finance/tva-status/`, invoice exoneration fields, team list includes self |
| `FRONTEND_INVOICE_PDF_AND_EDIT.md` | PDF `GET .../invoices/<id>/pdf/`, case-scoped PDF, PATCH rules (non-DRAFT: notes+due_date only), DELETE DRAFT-only |

---

## Quick prompt for Cursor (frontend)

When you make a backend change, you can paste this into Cursor on the frontend project:

```
Check and update the frontend for these backend changes. See the backend repo docs:

- docs/FRONTEND_CHAT_CONVERSATION_LIST.md – Chat: archive, pin, delete, order, display_name, unread
- docs/FRONTEND_CABINET_LOGO_UPDATE.md – Cabinet logo update
- docs/BACKEND_FRONTEND_SYNC.md – General sync process

Verify: API calls use the correct endpoints, request format (e.g. multipart for files), 
and handle responses/errors. Ensure UI reflects the new behavior.

For connectivity (env, base URL, auth, CORS): see docs/FRONTEND_BACKEND_CONNECTION.md

For TVA threshold + dashboard `tva_status` + invoice `tva_exoneration_note`: docs/FRONTEND_TVA_AND_FINANCE_UPDATES.md

For invoice PDF download + edit/delete rules (blob, non-DRAFT PATCH): docs/FRONTEND_INVOICE_PDF_AND_EDIT.md
```
