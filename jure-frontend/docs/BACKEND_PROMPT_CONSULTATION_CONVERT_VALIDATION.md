# Backend: Consultation → case conversion validation (`POST /cases/:id/convert/`)

## Problem

`POST /cases/:id/convert/` can return **400** when the consultation is marked “ready to convert” in **`case_specific_data`**, while the main **`Case.status`** is still something else (e.g. `IN_PROGRESS`) because older clients mapped **`CONVERTED_TO_CASE` → `IN_PROGRESS`** for legacy reasons.

The convert endpoint must not require only **`Case.status === CONVERTED_TO_CASE`** if the canonical workflow state lives under **`case_specific_data`**.

## Required changes

### 1. Accept conversion when **any** of these is true (CONSULTATION case)

- `Case.status == "CONVERTED_TO_CASE"`, **or**
- `case_specific_data.outcome == "CONVERTED_TO_CASE"` (support snake_case / camelCase variants your API uses), **or**
- `case_specific_data.status == "CONVERTED_TO_CASE"` if that field is used for consultation workflow.

Treat the consultation as “ready to convert” if **at least one** of the above matches, and `convertedToCase` / equivalent is still null.

### 2. Single source of truth (document in API / OpenAPI)

Choose and document one approach:

- **Option A:** Persist `CONVERTED_TO_CASE` on **`Case.status`** when the user sets “converted to case”, and keep nested fields in sync; **or**
- **Option B:** Treat nested fields (`outcome` / `status` inside `case_specific_data`) as authoritative for “ready to convert” and **do not** require `Case.status === CONVERTED_TO_CASE` alone.

### 3. Clear **400** response bodies

Return structured errors (e.g. `detail` or `code` + `message`) so clients can distinguish:

| Situation | Suggested signal |
|-----------|-------------------|
| Wrong case type (not a consultation) | e.g. `code: "not_consultation"` |
| Case not found | 404 as today |
| Already converted | 409 as today |
| Workflow not marked ready to convert | e.g. `code: "not_ready_to_convert"` and **which field was checked** (e.g. `checked: ["status", "case_specific_data.outcome"]`) |

Avoid a single generic 400 string for all validation failures.

## Related frontend behavior

- The frontend now maps consultation workflow **`CONVERTED_TO_CASE`** to **`Case.status: CONVERTED_TO_CASE`** on save where applicable (`payloadBuilder`), but **existing rows** may still have legacy `IN_PROGRESS` + `outcome: CONVERTED_TO_CASE` until re-saved.
- The case detail panel considers “ready” using nested workflow fields as well as top-level `status`, so the backend should align with that.

## Endpoint reference

- **Method:** `POST`
- **Path:** `/api/v1/cases/:id/convert/` (or your documented path)
- **Body:** `{ "targetType": "LITIGATION" | "ADMINISTRATIVE", ... }` (plus optional type-specific fields)
