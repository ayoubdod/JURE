# Chat Message Pinning (Shared)

Message pinning is **shared** among all participants. When anyone pins a message, all see it. Show pin icon on pinned messages.

## API

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Pin message | POST | `/api/v1/chat/messages/{id}/pin/` | `{ "pinned": true }` |
| Unpin message | POST | `/api/v1/chat/messages/{id}/pin/` | `{ "pinned": false }` |
| List pinned | GET | `/api/v1/chat/conversations/{id}/pinned-messages/` | — |

## Shared behavior

- **`is_pinned`**: `true` when at least one participant has pinned the message.
- **Pinned list**: Returns all messages with at least one pin; visible to all participants.
- **Pin/Unpin**: Adds or removes the current user's pin. When the last pin is removed, the message is no longer pinned.

## Frontend

- Message bubble: pin icon when `message.is_pinned === true`
- Pinned sheet: all pinned messages; tap to scroll to message
- Pin/Unpin menu: Pin / Unpin in message context menu
- Polls pinned list every 15s and on tab focus so other participants see pins even without WebSocket

## Backend (real-time sync)

When anyone pins/unpins, broadcast `message.updated` with the full message (including `is_pinned`) to **all** participants in the conversation WebSocket. The frontend already handles `message.updated` and will update instantly; polling is a fallback.
