# Frontend — TVA threshold (Art. 89 CGI) + finance API updates

Use this in the **frontend** repo (Cursor or team). Base URL: `/api/v1/` + Bearer auth. Finance routes require **OWNER** or **ADMIN** (`role` = `OWNER` | `ADMIN`).

---

## Short copy-paste prompt

```
Adopt backend finance/TVA updates (Moroccan law Art. 89 — lifetime cumulative 500 000 MAD CA threshold; no annual reset).

1) GET /api/v1/finance/dashboard/ — response now includes an EXTRA top-level key `tva_status` (all previous keys unchanged: kpis, charts, alerts, recent_transactions). Do not break parsers; merge/optional-chain `tva_status`.

2) New endpoint: GET /api/v1/finance/tva-status/ — returns the same `tva_status` object alone (OWNER/ADMIN only). Use for a dedicated TVA regime card or settings strip.

3) `tva_status` shape: { regime: "EXONÉRÉ" | "ASSUJETTI À LA TVA", is_tva_applicable: bool, lifetime_ca: string (formatted "X XXX,XX MAD"), threshold: string, ca_remaining: string, threshold_percentage: number, tva_became_applicable_at: ISO string | null, tva_threshold_crossed_amount: string | null, note: string (legal disclaimer) }.

4) Invoice objects (list/detail/create) now include: `tva_applicable` (bool, frozen at creation), `tva_exoneration_note` (string, non-empty when exonerated). Show exoneration text on invoice PDF/preview when applicable. TVA amounts are 0 when exonerated.

5) Cabinet team list GET /api/v1/cabinets/members/ now includes the current user and the cabinet owner in the list (for assignee pickers). Adjust UI if you assumed "never show self".

6) Fee POST still supports `planned_amount` as alias for `amount_expected`; see docs/FRONTEND_CASE_FEE_HONORAIRE.md. Invoice POST contract: docs/FRONTEND_CASE_INVOICE_CREATE.md.

7) Permissions unchanged: finance 403 message "Access denied. Finance module requires Owner or Administrator role."
```

---

## Full checklist

| Area | Action |
|------|--------|
| **Dashboard** | Read `tva_status` from `GET .../finance/dashboard/`. Show progress toward 500 000 MAD (use `threshold_percentage`, `ca_remaining`), regime label, legal `note`. |
| **TVA page / widget** | Optional: call `GET .../finance/tva-status/` for the same block without loading full dashboard. |
| **Invoice UI** | Display `tva_exoneration_note` on invoice detail and PDF when `tva_applicable === false`. |
| **Invoice form** | Request body unchanged (`fee_id`, `amount_ht`, `due_date`, `notes`). Response includes new fields — extend TypeScript/types. |
| **Team picker** | Members list may include yourself — allow selecting self for assignment if product requires it. |
| **i18n** | Regime strings may be French (`EXONÉRÉ`, `ASSUJETTI À LA TVA`) — map to UI locale if needed. |

---

## Example: fetch TVA status

```ts
const res = await fetch(`${API_BASE}/api/v1/finance/tva-status/`, {
  headers: { Authorization: `Bearer ${token}` },
});
const tvaStatus = await res.json();
// tvaStatus.regime, tvaStatus.lifetime_ca, ...
```

---

## Related backend docs

| File | Topic |
|------|--------|
| `FRONTEND_FINANCE_MODULE.md` | Finance routes overview |
| `FRONTEND_CASE_INVOICE_CREATE.md` | POST invoice JSON |
| `FRONTEND_CASE_FEE_HONORAIRE.md` | POST fee / honoraires |
| `BACKEND_FRONTEND_SYNC.md` | Sync process |

---

## Legal copy (for tooltips)

The backend sends `tva_status.note` in French: cumulative threshold over the **whole life** of the firm on the platform; once crossed, TVA applies **permanently** to **new** invoices (existing exonerated invoices stay without TVA).
