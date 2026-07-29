# Chat Read Receipts

The frontend shows delivery and read status under the sender's messages (WhatsApp-style).

## UI (sender's messages only)

| State | Icon | Color | Condition |
|-------|------|-------|-----------|
| Sent | ✓ Single check | Grey | `delivered_count === 0 && read_count === 0` |
| Delivered | ✓✓ Double check | Grey | `delivered_count > 0 && read_count === 0` |
| Read | ✓✓ Double check | Blue | `read_count > 0` |

## Frontend logic

Only render when `message.is_own === true`. Uses `delivered_count` and `read_count` from API. Handles `message.updated` via WebSocket for real-time check updates.

## Message fields

Each `Message` in the API should include:

- **`delivered_count`** (number): How many recipients have received the message (e.g. via WebSocket `message.new` or fetch)
- **`read_count`** (number): How many recipients have read the message (e.g. opened conversation and called `mark_read`)

## Backend behavior

1. **Serialization**: Include `delivered_count` and `read_count` on every message.
2. **Delivery**: Increment `delivered_count` when a recipient receives the message (e.g. when they are subscribed to the conversation WebSocket and receive `message.new`, or when they fetch messages).
3. **Read**: When `mark_read` is called, update read status for messages up to the last seen; increment `read_count` accordingly.
4. **Broadcast**: When `delivered_count` or `read_count` changes, broadcast `message.updated` to all participants so the sender sees the updated checks in real time.

## Direct vs group

- **Direct (2 people)**: `delivered_count` and `read_count` will be 0 or 1.
- **Group**: Count how many participants have delivered/read. For “delivered”, consider: message reached their client. For “read”, consider: they have opened the conversation and marked it read.
