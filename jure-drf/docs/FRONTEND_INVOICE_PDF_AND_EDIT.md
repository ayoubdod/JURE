# Frontend — Facture PDF, édition, suppression

Base API : `/api/v1/` + Bearer. Finance : **OWNER** ou **ADMIN** uniquement.

---

## Short copy-paste prompt

```
Adopt invoice (facture) PDF download + edit/delete rules.

1) PDF download (binary, not JSON)
   - GET /api/v1/finance/invoices/<id>/pdf/
   - OR GET /api/v1/cases/<caseId>/invoices/<id>/pdf/  (invoice must belong to that case; use from dossier UI)
   - Response: Content-Type: application/pdf, Content-Disposition: attachment; filename="facture-<invoice_number>.pdf"
   - Auth: same as finance (OWNER/ADMIN). 403 if wrong role; 404 if invoice not in user cabinet or wrong case+id pair.
   - Frontend: use fetch/axios with responseType: 'blob' (or window.open with Authorization if you use a token-in-query helper — prefer blob + object URL + download link).

2) Edit (existing)
   - PATCH or PUT /api/v1/finance/invoices/<id>/  with JSON body (see InvoiceUpdateSerializer fields).
   - NEW rule: if invoice.status !== "DRAFT", only `due_date` and `notes` may be updated. Attempts to change `amount_ht` or `tva_rate` return 400 with field errors and a French `detail` message.
   - For DRAFT: `amount_ht`, `due_date`, `notes`, `tva_rate` as before (amount changes recalc TVA/TTC on server).

3) Delete (existing)
   - DELETE /api/v1/finance/invoices/<id>/  → 204 only when status is DRAFT; otherwise 400 "Only draft invoices can be deleted."
   - Hide or disable delete for non-DRAFT; use status workflow (e.g. cancel) for emitted invoices.

4) UI checklist
   - "Télécharger PDF" button → GET pdf URL with Authorization header → blob → trigger download.
   - Edit form: for SENT/PAID/etc. show read-only amount fields; allow notes + due date only.
   - Optional: preview PDF in new tab via blob URL (revokeObjectURL after).
```

---

## Endpoints (résumé)

| Action | Method | Path |
|--------|--------|------|
| PDF (cabinet scope) | GET | `/api/v1/finance/invoices/<id>/pdf/` |
| PDF (case scope) | GET | `/api/v1/cases/<caseId>/invoices/<id>/pdf/` |
| Détail / MAJ | GET, PATCH, PUT | `/api/v1/finance/invoices/<id>/` |
| Suppression | DELETE | `/api/v1/finance/invoices/<id>/` |

---

## Exemple : télécharger le PDF (fetch + blob)

```ts
const url = `${API_BASE}/api/v1/finance/invoices/${invoiceId}/pdf/`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) throw new Error(await res.text());
const blob = await res.blob();
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `facture-${invoiceNumber}.pdf`;
a.click();
URL.revokeObjectURL(a.href);
```

---

## Related backend docs

| File | Topic |
|------|--------|
| `FRONTEND_CASE_INVOICE_CREATE.md` | POST create invoice JSON |
| `FRONTEND_FINANCE_MODULE.md` | Finance routes overview |
| `BACKEND_FRONTEND_SYNC.md` | Sync index |
