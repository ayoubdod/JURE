# Backend Prompt: Chat Archive, Pin, Delete

## Change Summary
The frontend now supports archive, pin, and delete actions on conversation items. Pinned conversations appear at the top. Archived conversations are hidden by default; an "Archived" section uses `?include_archived=1` to fetch archived items.

## Affected Areas
- **Endpoints:**
  - `GET /chat/conversations/` – add optional `?include_archived=1` param
  - `PATCH /chat/conversations/{id}/` – support `archived` and `pinned` in request body
  - `DELETE /chat/conversations/{id}/` – (existing)

## Frontend Expectations

### List conversations
- **Default:** `GET /chat/conversations/` returns only non-archived conversations (for current user's membership).
- **With archived:** `GET /chat/conversations/?include_archived=1` returns all conversations (active + archived). Each has `archived: boolean` (from current user's membership).

### Update conversation (archive/pin)
- **PATCH** `/chat/conversations/{id}/` with JSON body:
  - `{ archived: true }` – archive
  - `{ archived: false }` – unarchive
  - `{ pinned: true }` – pin
  - `{ pinned: false }` – unpin
- **Response:** Updated `Conversation` object.

### Response shape
Each conversation should include:
- `archived?: boolean` – whether current user has archived (per-membership)
- `pinned?: boolean` – whether current user has pinned (per-membership)

## Backend Checklist – Please Verify
- [ ] `GET /chat/conversations/` without params returns only non-archived conversations.
- [ ] `GET /chat/conversations/?include_archived=1` returns all conversations with `archived` flag set.
- [ ] `PATCH /chat/conversations/{id}/` accepts `archived` and `pinned` in request body.
- [ ] Archive/unarchive updates the current user's membership (not the conversation itself).
- [ ] Pin/unpin updates the current user's membership.
- [ ] Response includes `archived` and `pinned` for each conversation.
