# Case fee (honoraire) — API contract (backend ↔ frontend)

Aligned with the `finance` app: `POST /api/v1/cases/<case_id>/fees/` and related fee serializers.

---

## Route

| Method | Path |
|--------|------|
| `GET` | `/api/v1/cases/<case_id>/fees/` |
| `POST` | `/api/v1/cases/<case_id>/fees/` |

Registered in `core/urls.py` via `path('api/v1/cases/<int:case_id>/', include('finance.case_urls'))` → `fees/` in `finance/case_urls.py`.

There is **no** separate `/honoraires/` route; use the path above.

---

## Auth & permissions

- Header: `Authorization: Bearer <token>` (JWT/access token as used elsewhere).
- **Finance**: only cabinet **OWNER** and **ADMIN** (`role === "ADMIN"`). Others get **403** with  
  `"Access denied. Finance module requires Owner or Administrator role."`
- Case must belong to the same cabinet as the user; wrong/missing case → **404** (not found in cabinet scope).

---

## Request body (create / update fee)

Send **JSON** (`Content-Type: application/json`).

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `fee_type` | string | yes | `FIXED` \| `HOURLY` \| `SUCCESS_FEE` |
| `planned_amount` | number | yes* | Frontend name for the agreed/estimated amount. |
| `amount_expected` | number | yes* | Same meaning as `planned_amount` (DB field). |
| `lawyer_id` | integer \| null | no | See below. |
| `notes` | string | no | |

\*Provide **either** `planned_amount` **or** `amount_expected` (or both with the **same** value). If both are set to different values → **400** field error.

---

## `lawyer_id` — Cabinet member vs User

The legacy **CabinetMember** model was **removed** from this codebase.  
`GET /api/v1/cabinets/members/` returns **`User`** rows; each member’s **`id` is `User.pk`**.

So the value the UI calls “cabinet member id” **is** the Django **user id** to send as `lawyer_id`.

Allowed lawyers for a fee:

- Users with `cabinet` = case’s cabinet and `is_cabinet_member=True`, **or**
- The cabinet **owner** (`Cabinet.owner_id`).

If `lawyer_id` is not in that set (or invalid pk) → **400** with DRF validation errors (not 500).

---

## Response (fee object, 201 / GET)

Includes both canonical and frontend-friendly names:

- `amount_expected` (number)
- `planned_amount` (number, same value — alias for UI)
- `fee_type`, `amount_billed`, `amount_paid`, `remaining`, `status`, `notes`, …
- `lawyer`: `{ "id", "firstName", "lastName" }` or `null`

---

## Manual test (example)

```bash
curl -s -X POST "http://localhost:8000/api/v1/cases/1/fees/" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"fee_type\":\"FIXED\",\"planned_amount\":\"5000.00\",\"lawyer_id\":42,\"notes\":\"\"}"
```

Expect **201** and a JSON fee object. **400** = validation (body); **403** = role; **404** = case not in cabinet.

---

## Related

- Full finance module: `docs/FRONTEND_FINANCE_MODULE.md`
- Sync index: `docs/BACKEND_FRONTEND_SYNC.md`
