# Backend Prompt: Chat Message Ownership & Structure

Use this prompt in Cursor on the **backend** project so the frontend can correctly show sent messages on the right and received messages on the left.

---

## Copy-paste prompt for backend

```
The chat frontend needs to distinguish "sent by me" vs "received from others" to show messages on the right (own) vs left (others). Currently this fails. Apply the following changes:

## 1. Add `is_own` to every message (CRITICAL – simplest fix)

For each message in REST responses and WebSocket payloads, include:
```json
{
  "id": 123,
  "conversation": 1,
  "sender": 5,
  "body": "Hello",
  "sent_at": "2025-03-21T12:00:00Z",
  "is_own": true
}
```

- `is_own`: boolean. `true` if the message was sent by the current authenticated user (the one making the request or connected via WebSocket). `false` otherwise.
- Compute this in the serializer: `is_own = (obj.sender == request.user)` or `(obj.sender_id == request.user.id)` depending on your model.
- For WebSocket: when sending `message.new` or `message.history`, include `is_own` for each message based on the connected user.

This alone will fix the sent/received layout without any other changes.

---

## 2. Conversation `memberships` must include all participants

For `GET /api/v1/chat/conversations/` and any conversation payload, each conversation must have:

```json
{
  "id": 1,
  "type": "direct",
  "memberships": [
    {
      "id": 10,
      "user": {
        "id": 5,
        "email": "hammady@example.com",
        "first_name": "Hammady",
        "last_name": "Ayoub"
      }
    },
    {
      "id": 11,
      "user": {
        "id": 7,
        "email": "mahmoud@example.com",
        "first_name": "Mahmoud",
        "last_name": "El Ouali"
      }
    }
  ]
}
```

- **Include the current user** in `memberships`, not just the "other" participant.
- Each membership must have a `user` (or `cabinet_member`) object with: `id` or `pk`, `email`, `first_name`, `last_name`.
- If you use `cabinet_member` instead of `user`, that's fine – the frontend supports both. Just ensure the same shape: `id`, `email`, `first_name`, `last_name`.

---

## 3. Message `sender` must be resolvable

- `msg.sender` can be a numeric ID (e.g. `5`) or an object `{ "id": 5, "email": "...", "first_name": "...", "last_name": "..." }`.
- The sender ID must match one of the `memberships[].user.id` (or `memberships[].cabinet_member.id`) in the same conversation.
- If your chat uses CabinetMember IDs and auth uses User IDs, ensure consistency or add `is_own` (see #1).

---

## 4. WebSocket message format

When sending over `ws://.../ws/conversation/{id}/`:

**message.history** (on join):
```json
{
  "type": "message.history",
  "payload": [
    {
      "id": 1,
      "sender": 5,
      "body": "Hello",
      "sent_at": "...",
      "is_own": true
    },
    {
      "id": 2,
      "sender": 7,
      "body": "Hi",
      "sent_at": "...",
      "is_own": false
    }
  ]
}
```

**message.new** (on new message):
```json
{
  "type": "message.new",
  "payload": {
    "id": 3,
    "sender": 5,
    "body": "New message",
    "sent_at": "...",
    "is_own": true
  }
}
```

Include `is_own` in every message so the frontend does not need to guess from memberships.

---

## 5. Summary of required changes

| Change | Priority |
|--------|----------|
| Add `is_own: boolean` to every message (REST + WebSocket) | **Critical** |
| Include current user in conversation `memberships` | High |
| Ensure `sender` matches a membership's user id | High |
| WebSocket: `message.history` and `message.new` with `is_own` | **Critical** |

The fastest fix is adding `is_own` to the message serializer and WebSocket payloads. The frontend will use it immediately and stop relying on fallbacks.
```

---

## Quick reference for backend dev

- **Message serializer**: Add `is_own = serializer_context.get('request').user.id == obj.sender_id` (or equivalent).
- **WebSocket consumer**: When building message dict for `message.history` / `message.new`, set `is_own = (msg.sender_id == self.scope["user"].id)`.
- **Conversation serializer**: Ensure `memberships` includes all participants, including the requesting user.
