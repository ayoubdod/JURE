# Cursor Prompt: Backend Chat API Verification

Use this prompt in Cursor on the **backend** project to verify and align the chat API with the frontend.

---

## Copy-paste prompt for Cursor Backend

```
Check and align the chat backend with the frontend. Verify the following:

## 1. API base path
- All chat endpoints use `api/v1/chat/` (e.g. `GET /api/v1/chat/conversations/`).

## 2. Endpoints and methods

| Action | Method | Endpoint | Request body |
|--------|--------|----------|--------------|
| List conversations | GET | `/api/v1/chat/conversations/` | Query: `?include_archived=1` (optional) |
| Create conversation | POST | `/api/v1/chat/conversations/` | `{ participants, title?, type? }` |
| Pin / Unpin | POST | `/api/v1/chat/conversations/{id}/pin/` | `{ "pinned": true }` or `{ "pinned": false }` |
| Archive / Unarchive | POST | `/api/v1/chat/conversations/{id}/archive/` | `{ "archived": true }` or `{ "archived": false }` |
| Mark conversation read | POST | `/api/v1/chat/conversations/{id}/mark_read/` | — |
| Delete conversation | DELETE | `/api/v1/chat/conversations/{id}/` | — |
| Send message | POST | `/api/v1/chat/messages/` | multipart: `conversation`, `body`, `attachments` |

## 3. List conversations – query params
- **Default:** Without `include_archived`, return only non-archived conversations for the current user.
- **With `include_archived=1`:** Return all conversations (active + archived). Each item must have `archived: boolean` set.

## 4. List conversations – order
- Return conversations in this order: pinned first, then by most recent activity (latest_message.sent_at or created desc).
- Frontend renders in the exact order returned (no client-side re-sort).

## 5. Conversation response shape
Each conversation must include:
- `id`, `type`, `title`, `memberships`, `created`
- `display_name` – direct: peer name, group: title
- `other_participant` – for direct: `{ full_name, ... }`
- `latest_message` – `{ body, sender, sent_at or created, ... }`
- `unread_count` – number
- `archived` – boolean (current user's membership)
- `is_pinned` – boolean (current user's membership)

## 6. Message response
- Use `body` for message text (frontend also accepts `content` for compatibility).
- Include `sent_at` or `created` for timestamp.

## 7. Error handling
- **403** – Not a member: return 403 with appropriate message.
- **404** – Conversation not found: return 404 (e.g. after delete).
- Frontend shows toasts for 403/404 and removes invalid items from the list.

## 8. Mark as read
- `POST /api/v1/chat/conversations/{id}/mark_read/` marks all messages in that conversation as read for the current user.
- Called when the user opens a conversation. Frontend refetches the list after success to update unread badges.

## 9. Delete vs Leave
- For groups: DELETE can mean "leave" (remove membership). Frontend shows "Leave conversation?" for groups.
- For direct: DELETE removes the conversation.

Verify all endpoints exist, use the correct HTTP methods, and return the expected fields. Update serializers/views as needed.
```

---

## Copy-paste prompt: Chat presence (online status)

Use this prompt in Cursor on the **backend** project to implement or verify WebSocket presence for the chat sidebar member avatars.

```
Implement or verify chat WebSocket presence so the frontend can show green dots for connected members.

## WebSocket: ws/chat/

When a user connects to the chat WebSocket, include who is currently online in the response.

## 1. On connection.established

When the client connects, send a message like:

{
  "type": "connection.established",
  "payload": {
    "notifications": [...],
    "online_member_ids": [1, 2, 3]
  }
}

- `notifications` – array of existing notifications (or whatever the current payload is)
- `online_member_ids` – array of cabinet member IDs who are currently connected to the chat WebSocket

**Alternative:** If you use user IDs instead of cabinet member IDs, send `online_user_ids` instead:

{
  "type": "connection.established",
  "payload": {
    "notifications": [...],
    "online_user_ids": [10, 11, 12]
  }
}

**Fallback:** A generic `online` array is also accepted (used for both member and user ID matching):

{
  "type": "connection.established",
  "payload": {
    "online": [1, 2, 3]
  }
}

## 2. On presence.list or presence.update (optional)

When presence changes (user connects/disconnects), broadcast to connected clients:

{
  "type": "presence.update",
  "payload": {
    "online_member_ids": [1, 2, 3]
  }
}

Or: `online_user_ids`, or a top-level array, or `online`.

## 3. ID semantics

- `online_member_ids`: cabinet member IDs (same as participants in create conversation)
- `online_user_ids`: user/auth IDs (frontend matches via cabinet_member.user_id or cabinet_member.user.id)

## 4. Frontend behavior

The frontend shows member avatars under the chat search bar. Members in the online list get a green dot. Disconnected members have no dot.
```

---

## Quick checklist for backend

- [ ] **Pin (conversation)** – Frontend tries: A) POST `/{id}/pin/` → B) POST `/pin/` body `{ conversation_id, pinned }` → C) PATCH `/{id}/` body `{ is_pinned }`
- [ ] **Pin (message)** – POST `messages/{id}/pin/` body `{ "pinned": true }` or `{ "pinned": false }`. Shared: all participants see pinned messages. List: GET `conversations/{id}/pinned-messages/`
- [ ] **Archive** – Frontend tries: A) POST `/{id}/archive/` → B) POST `/archive/` body `{ conversation_id, archived }` → C) PATCH `/{id}/` body `{ archived }`
- [ ] **Option B** – If A returns 404, frontend uses POST without id in URL: body `{ conversation_id, id, archived|pinned }`
- [ ] Mark read: `POST /conversations/{id}/mark_read/` (conversation-level, not message-level)
- [ ] List: `?include_archived=1` returns all with `archived` flag
- [ ] Response: `display_name`, `other_participant`, `is_pinned`, `unread_count`
- [ ] Order: pinned first, then by latest activity
- [ ] Errors: 403 for not a member, 404 for not found
- [ ] **Read receipts** – Each message includes `delivered_count` and `read_count`. Sender sees: single check (sent), double grey (delivered), double blue (read). Backend tracks delivery (e.g. recipient received via WebSocket) and read (e.g. via mark_read). Broadcast `message.updated` when counts change.
