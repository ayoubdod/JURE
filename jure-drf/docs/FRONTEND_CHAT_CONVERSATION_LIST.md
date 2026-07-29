# Chat: Conversation list – Frontend prompt

**Context:** The backend supports archive, pin, and delete for conversations. Conversations are ordered: pinned first, then by most recent activity. Archived conversations are hidden by default.

**Goal:** Implement archive, pin, and delete actions in the chat sidebar. Render conversations in the order returned. Show `display_name`, `latest_message`, `unread_count`, `archived`, `is_pinned`.

---

## 1. API changes

### List conversations

**Endpoint:** `GET /api/v1/chat/conversations/`

- **Auth:** Bearer token (JWT).
- **Query params:**
  - `include_archived=1` – Include archived conversations (default: excluded).
- **Response:** Array of conversations, **ordered: pinned first, then by most recent activity**.

Each conversation object includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Conversation ID |
| `type` | string | `"direct"` or `"group"` |
| `title` | string | Group title (may be empty for direct) |
| `display_name` | string | Direct = peer name, group = title |
| `other_participant` | object \| null | For direct: `{ id, first_name, last_name, email, full_name }` |
| `latest_message` | object \| null | `{ id, body, sender, created, ... }` – last message preview |
| `unread_count` | number | Unread messages for current user |
| `archived` | boolean | Whether current user has archived this conversation |
| `is_pinned` | boolean | Whether current user has pinned this conversation |
| `memberships` | array | Participant memberships |
| `created` | string | ISO datetime |

### Archive / unarchive

**Endpoint:** `POST /api/v1/chat/conversations/{id}/archive/`

- **Body:** `{ "archived": true }` or `{ "archived": false }`
- **Success:** `200 OK` – `{ "status": "archived" }` or `{ "status": "unarchived" }`
- **403:** Not a member of the conversation.

### Pin / unpin

**Endpoint:** `POST /api/v1/chat/conversations/{id}/pin/`

- **Body:** `{ "pinned": true }` or `{ "pinned": false }`
- **Success:** `200 OK` – `{ "status": "pinned" }` or `{ "status": "unpinned" }`
- **403:** Not a member of the conversation.

### Delete (leave / remove)

**Endpoint:** `DELETE /api/v1/chat/conversations/{id}/`

- **Success:** `204 No Content` – Leaves the conversation (group) or deletes it (direct 1-on-1).
- **403:** Not a participant.

---

## 2. Frontend checklist

- [ ] **Order:** Render conversations in the **exact order** returned (pinned first, then by activity).
- [ ] **Display name:** Use `display_name` for the nav title.
- [ ] **Last message:** Show `latest_message.body` (or `[Attachment]` if empty) under the name.
- [ ] **Unread badge:** Show `unread_count` when > 0.
- [ ] **Pin icon:** Show pin/unpin icon; call `POST .../pin/` with `{ pinned: true/false }`; refetch list.
- [ ] **Archive action:** Add "Archive" to context menu; call `POST .../archive/` with `{ archived: true }`; remove from list (or refetch). Add "Archived" section with `GET .../conversations/?include_archived=1` and filter `archived === true`; "Unarchive" calls `{ archived: false }`.
- [ ] **Delete action:** Add "Delete" / "Leave" to context menu; call `DELETE .../conversations/{id}/`; confirm dialog for groups; refetch list.
- [ ] **Refresh after open:** After `POST .../mark_read/`, refetch the list.
- [ ] **Real-time:** On new message (WebSocket), refetch list or move conversation to top.

---

## 3. Example: archive, pin, delete

```js
// Archive
await fetch(`${API_BASE}/api/v1/chat/conversations/${id}/archive/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ archived: true }),
});

// Unarchive
await fetch(`${API_BASE}/api/v1/chat/conversations/${id}/archive/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ archived: false }),
});

// Pin
await fetch(`${API_BASE}/api/v1/chat/conversations/${id}/pin/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ pinned: true }),
});

// Unpin
await fetch(`${API_BASE}/api/v1/chat/conversations/${id}/pin/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ pinned: false }),
});

// Delete / leave
await fetch(`${API_BASE}/api/v1/chat/conversations/${id}/`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` },
});
```

---

## 4. Edge cases / notes

- **Archived:** By default, archived conversations are excluded. Use `?include_archived=1` to show them in an "Archived" section.
- **Pinned:** Pinned conversations appear at the top. Refetch after pin/unpin.
- **Delete:** Group = leave (soft delete membership). Direct 1-on-1 = conversation deleted.
- **API base:** Use `api/v1/chat` (not `api/chat`).
