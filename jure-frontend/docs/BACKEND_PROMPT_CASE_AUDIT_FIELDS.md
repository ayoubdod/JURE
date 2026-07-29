# Backend prompt: Case audit fields for GET `/api/v1/cases/:id/` (and list if applicable)

Copy everything below the line into your backend chat / ticket.

---

## Context

The Jure frontend **case detail drawer** shows four audit fields:

1. **Created** — date/time (already works from `created`)
2. **Created by** — shows `—` unless the API returns a populated **`created_by`**
3. **Last updated** — shows `—` unless the API returns an **`updated_at`** (or equivalent) timestamp
4. **Updated by** — shows `—` unless the API returns **`updated_by`**

## Required behavior

### `created_by` (mandatory for correct UX)

- **`created_by` must be the authenticated user (cabinet member) who created the case** — the person who performed `POST /cases/`, not the client.
- Return it as a **nested user object** on the case serializer for **retrieve** (`GET /cases/:id/`) and ideally on **list** (`GET /cases/`) so cards/lists stay consistent later.
- If the model already has `created_by_id` / FK to `User`, expose it via `PrimaryKeyRelatedField` → nested `UserSerializer` (read), same pattern as `assigned_to` / `client`.

### `updated_at`

- Persist and expose **`updated_at`** (auto-updated on every successful case `PATCH`/`PUT`).
- If you use Django: `auto_now=True` on the Case model + include `updated_at` in the serializer output as **ISO 8601 string** (same format as `created`).

### `updated_by`

- On each successful update, set **`updated_by`** to the **current user** performing the request.
- Expose **`updated_by`** as a nested **user object** (same shape as `created_by`), not only an ID.

## JSON shape expected by the frontend

The React app reads **camelCase or snake_case** for update fields; snake_case is preferred to match DRF defaults.

**Minimum for the detail view to stop showing `—`:**

```json
{
  "id": 1,
  "created": "2026-03-22T14:19:00.000Z",
  "created_by": {
    "id": 42,
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@firm.com"
  },
  "updated_at": "2026-03-22T16:05:00.000Z",
  "updated_by": {
    "id": 42,
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@firm.com"
  }
}
```

If you only emit snake_case, that is fine:

- `created_by`, `updated_at`, `updated_by`

Optional aliases the frontend also checks for **last updated time** (if `updated_at` is missing): `updatedAt`, `updated`, `modified` (string).

Optional aliases for **updated by user**: `updatedBy` (object).

## Implementation checklist (Django REST Framework style)

1. **Model**: `created_by = ForeignKey(User, ...)` set on create; `updated_at = DateTimeField(auto_now=True)`; `updated_by = ForeignKey(User, null=True, ...)`.
2. **Create**: `created_by = request.user` in `perform_create` (or serializer create).
3. **Update**: `updated_by = request.user` in `perform_update` or serializer `update()`.
4. **Serializer**: `created_by = UserSerializer(read_only=True)`, `updated_by = UserSerializer(read_only=True)`, `updated_at = DateTimeField(read_only=True)` — include these fields in **Case** retrieve (and list if you want parity).
5. **Migration**: add columns if missing; backfill **`created_by`** from historical data where possible (e.g. `request.user` at creation time is often lost — at minimum set for new cases going forward).

## Verify

After deploy, call `GET /api/v1/cases/<id>/` and confirm the JSON includes non-null `created_by`, `updated_at`, and `updated_by` after an edit.

---

_End of copy-paste prompt._
