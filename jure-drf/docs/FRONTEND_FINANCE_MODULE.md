# Frontend alignment prompt – Finance module (cases, fees, invoices, payments, tax advance)

**Copy the short or full section below into Cursor (frontend project) or share with the frontend team.**

---

## Short copy-paste prompt

```
Finance is case-centric and restricted to cabinet OWNER and ADMIN (Administrator) only. All finance APIs are under /api/v1/ with Bearer auth. If the user’s role is MANAGER, LAWYER, ASSISTANT, or VIEWER, the API returns 403 with detail: "Access denied. Finance module requires Owner or Administrator role." Hide the Finance tab, routes, and actions unless role is OWNER or ADMIN. Case summary: GET /api/v1/cases/:caseId/finance/. Nested resources: /api/v1/cases/:caseId/fees|invoices|payments|tax-advance/. Firm-wide lists and dashboard: /api/v1/finance/dashboard/, /api/v1/finance/invoices/, /api/v1/finance/payments/. Detail routes: /api/v1/finance/fees|invoices|payments/:id/ (invoice status PATCH at .../invoices/:id/status/). Money amounts are JSON numbers. TVA default 20%; invoice numbers FAC-YYYY-XXX per firm/year. Tax advance 100 MAD per case (auto-created on new case). Client fiscal fields (ICE, IF) live on the Client profile model (linked to the case’s client User); expose in client forms if you edit B2B data.
```

---

## Full copy-paste prompt

```
══════════════════════════════════════════════════════════════════
FINANCE MODULE – FRONTEND ALIGNMENT (Moroccan law firm SaaS)
══════════════════════════════════════════════════════════════════

GOAL
- Implement or align Finance UI (tab, case finance panel, invoices, payments, fees, tax advance, firm dashboard) with the backend below.
- All financial records are tied to a CASE. Invoice/payment flows require the case to have a client (User) so a Client fiscal profile can be resolved.

══════════════════════════════════════════════════════════════════
1. ACCESS CONTROL (CRITICAL)
══════════════════════════════════════════════════════════════════
- Allowed roles ONLY: OWNER, ADMIN (backend value "ADMIN" = Administrator in UI).
- Denied: MANAGER, LAWYER, ASSISTANT, VIEWER → 403 Forbidden.
- Error body (typical): { "detail": "Access denied. Finance module requires Owner or Administrator role." }
- Auth: Authorization: Bearer <token>
- Do NOT gate normal case create/list/detail; only finance endpoints and UI.
- Superusers: backend may allow; treat as dev-only unless product says otherwise.

UI
- Hide/disable Finance navigation, routes, and mutation buttons for non–Owner/Admin users.
- Optional: show a short message if they deep-link to a finance URL.

══════════════════════════════════════════════════════════════════
2. BASE URL & HEADERS
══════════════════════════════════════════════════════════════════
- Prefix: /api/v1/  (always include /api/v1/)
- Content-Type: application/json for JSON bodies
- Auth: Bearer token

══════════════════════════════════════════════════════════════════
3. CASE-LEVEL FINANCE (nested under case id)
══════════════════════════════════════════════════════════════════

GET  /api/v1/cases/:caseId/finance/
  Summary for one case.

Response (shape):
{
  "case": {
    "id": number,
    "reference": string,
    "title": string,
    "caseType": "CONSULTATION" | "LITIGATION" | "ADMINISTRATIVE",
    "status": string
  },
  "financial_status": "PENDING" | "BILLED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE",
  "summary": {
    "amount_expected": number,   // sum of fees’ amount_expected
    "total_billed": number,
    "total_paid": number,
    "remaining": number          // total_billed - total_paid
  },
  "fees": [ ... ],
  "invoices": [ ... ],
  "payments": [ ... ],
  "tax_advance": { "amount": number, "status": "UNPAID"|"PAID", "paid_date": string|null } | null
}

GET  /api/v1/cases/:caseId/fees/
POST /api/v1/cases/:caseId/fees/
  Body: {
    "fee_type": "FIXED"|"HOURLY"|"SUCCESS_FEE",
    "planned_amount": number,        // at least one of planned_amount / amount_expected required (honoraire)
    "amount_expected": number,        // optional alias — same DB field; if both sent, values must match
    "lawyer_id": number|null,         // User.pk — cabinet /members/ list uses User rows (see FRONTEND_CASE_FEE_HONORAIRE.md)
    "notes": string (optional)
  }
  Response fee object includes both amount_expected and planned_amount (same value).
  Exact contract: docs/FRONTEND_CASE_FEE_HONORAIRE.md

GET  /api/v1/cases/:caseId/invoices/
POST /api/v1/cases/:caseId/invoices/
  Body: { "fee_id"?: number|null, "amount_ht": number, "due_date"?: "YYYY-MM-DD"|null, "notes"?: string }
  Server assigns invoice_number, tva_rate (default 20), tva_amount, amount_ttc.
  Contrat détaillé + erreurs: docs/FRONTEND_CASE_INVOICE_CREATE.md

GET  /api/v1/cases/:caseId/payments/
POST /api/v1/cases/:caseId/payments/
  Body: {
    "amount": number,
    "payment_method": "CASH"|"VIREMENT_BANCAIRE"|"CHEQUE",
    "payment_date": "YYYY-MM-DD",
    "invoice_id"?: number|null,
    "reference"?: string,
    "notes"?: string
  }

GET  /api/v1/cases/:caseId/tax-advance/
PATCH /api/v1/cases/:caseId/tax-advance/
  Body: { "status": "PAID", "paid_date": "YYYY-MM-DD" }
  (Mandatory 100 MAD acompte; created automatically when a case is created.)

══════════════════════════════════════════════════════════════════
4. RESOURCE DETAIL (by resource id, not nested under case)
══════════════════════════════════════════════════════════════════

Fees
GET    /api/v1/finance/fees/:id/
PUT    /api/v1/finance/fees/:id/
PATCH  /api/v1/finance/fees/:id/
DELETE /api/v1/finance/fees/:id/

Invoices
GET    /api/v1/finance/invoices/:id/
PUT    /api/v1/finance/invoices/:id/
PATCH  /api/v1/finance/invoices/:id/
  Body (typical): amount_ht, due_date, notes, tva_rate — status NOT here; use status endpoint.
DELETE /api/v1/finance/invoices/:id/
  Only if status == "DRAFT"; otherwise expect 400.

PATCH  /api/v1/finance/invoices/:id/status/
  Body: { "status": "SENT"|"OVERDUE"|"CANCELLED" }
  (Do not set PAID here; payments drive PAID / PARTIALLY_PAID.)

Payments
GET    /api/v1/finance/payments/:id/
DELETE /api/v1/finance/payments/:id/

══════════════════════════════════════════════════════════════════
5. FIRM-WIDE LISTS & DASHBOARD
══════════════════════════════════════════════════════════════════

GET /api/v1/finance/dashboard/
  Query: period = "month"|"quarter"|"year" (default "month"), year = number (default current year)

Response (shape):
{
  "kpis": {
    "ca_total": number,
    "total_received": number,
    "tva_to_pay": number,
    "tax_advances_unpaid": number,
    "outstanding": number
  },
  "charts": {
    "monthly_revenue": [ { "month": string, "ca": number, "received": number }, ... ],
    "revenue_by_lawyer": [ { "lawyer_id": number, "name": string, "total_billed": number }, ... ]
  },
  "alerts": [
    {
      "type": "OVERDUE_INVOICE"|"UNPAID_TAX_ADVANCE"|"TVA_DUE",
      "message": string,
      "case_id": string|null,
      "amount": number,
      "due_date": string|null
    }
  ],
  "recent_transactions": [
    {
      "case_reference": string,
      "client_name": string,
      "amount": number,
      "type": "PAYMENT"|"INVOICE",
      "date": string,
      "status": string
    }
  ]
}

GET /api/v1/finance/invoices/
  Query: status, client_id (Client profile id), dateFrom, dateTo, page, per_page

GET /api/v1/finance/payments/
  Query: payment_method, client_id, dateFrom, dateTo, page, per_page

Pagination (lists): follow backend response; supports per_page (and page) as in other app lists.

══════════════════════════════════════════════════════════════════
6. ENTITY FIELDS (FOR FORMS & TABLES)
══════════════════════════════════════════════════════════════════

Fee (read)
- id, case, fee_type, amount_expected, planned_amount (same as amount_expected), amount_billed, amount_paid, remaining (computed), status, notes, created_at, updated_at
- lawyer: { id, firstName, lastName } | null

Invoice (read)
- id, invoice_number, case, client (nested: id, name, ice, if_number), fee, amount_ht, tva_rate, tva_amount, amount_ttc,
  status, issued_date, due_date, notes, created_by, created_at, updated_at, is_overdue

Payment (read)
- id, case, client (id), invoice: { id, invoice_number, amount_ttc } | null,
  amount, payment_method, payment_date, reference, notes, created_by, created_at

Tax advance (read)
- id, case, amount (100), status, paid_date, created_at

Enums (display labels in French UI as needed)
- fee_type: FIXED | HOURLY | SUCCESS_FEE
- fee status: PENDING | PARTIALLY_PAID | PAID | CANCELLED
- invoice status: DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
- payment_method: CASH | VIREMENT_BANCAIRE | CHEQUE
- tax advance: UNPAID | PAID

══════════════════════════════════════════════════════════════════
7. BUSINESS RULES (UX)
══════════════════════════════════════════════════════════════════
- TVA: Moroccan standard 20% on invoices; amounts stored per invoice (tva_rate / tva_amount / amount_ttc).
- Invoice numbering: FAC-YYYY-XXX sequential per firm per year (server-generated).
- Tax advance: 100 MAD per new case; mark paid via PATCH tax-advance with paid_date.
- B2B invoicing: ICE and IF live on the Client fiscal profile (linked to the case’s client User). If the client API does not expose them yet, plan forms/API extension separately; invoices already return ice/if_number on nested client when present.

══════════════════════════════════════════════════════════════════
8. FRONTEND CHECKLIST
══════════════════════════════════════════════════════════════════
- [ ] Gate all finance routes and API calls on role OWNER or ADMIN.
- [ ] Handle 403 with the exact backend message when role is insufficient.
- [ ] Case detail: Finance tab loads GET .../cases/:id/finance/ and shows summary + lists.
- [ ] Create invoice only if case has a client; handle validation errors from API.
- [ ] Create payment with Moroccan payment methods only (three choices).
- [ ] Invoice delete only for DRAFT; show error otherwise.
- [ ] Invoice status workflow: PATCH .../status/ for SENT / OVERDUE / CANCELLED; PAID from payments.
- [ ] Dashboard: period + year query params; render KPIs, charts, alerts, recent_transactions.
- [ ] Firm lists: filters and pagination (per_page, page).
- [ ] Format currency (MAD) and dates consistently; numbers may arrive as JSON numbers.

══════════════════════════════════════════════════════════════════
9. EDGE CASES
══════════════════════════════════════════════════════════════════
- User without cabinet: backend may return 403 for finance routes with a cabinet message.
- tax_advance missing on legacy cases: GET may return empty object; treat as “no row” or backfill on backend if needed.
- Case without client: block invoice/payment creation in UI or show API error.

```

---

## File location

- Backend reference: this repo, `finance/` app; URL wiring in `core/urls.py` (`finance.urls`, `finance.case_urls`).
- Indexed in `docs/BACKEND_FRONTEND_SYNC.md` under “Existing frontend prompts”.
