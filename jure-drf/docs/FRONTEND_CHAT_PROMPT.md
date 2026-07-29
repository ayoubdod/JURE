# Chat Frontend – Cursor Prompt

**Copy the prompt below and paste it into Cursor in your frontend project tab.**

---

## Copy-paste prompt

```
Implement a chat frontend that integrates with the backend API. The backend and frontend are in separate folders; use your frontend's API base (e.g. process.env.VITE_API_URL or REACT_APP_API_URL) and ensure it points to the backend.

══════════════════════════════════════════════════════════════════
1. API & WEBSOCKET BASE
══════════════════════════════════════════════════════════════════
- REST base: `${API_BASE}/api/v1/chat/`  (e.g. http://localhost:8000/api/v1/chat)
- WebSocket for user notifications: `ws://HOST/ws/chat/?token=<JWT>`
- WebSocket for conversation real-time: `ws://HOST/ws/conversation/<conversation_id>/`

Required headers for REST:
- Authorization: Bearer <token>
- Content-Type: application/json (for POST/PATCH/PUT with body)

══════════════════════════════════════════════════════════════════
2. CONVERSATION LIST
══════════════════════════════════════════════════════════════════
GET /api/v1/chat/conversations/
- Order: Render in exact order returned. Backend returns pinned first, then by most recent activity.
- Title: Use `display_name` (direct = peer name, group = title). Fallback: `other_participant?.full_name` or `title`.
- Preview: `latest_message.body`. If body empty but latest_message exists: show "[Attachment]". If `latest_message.is_deleted`: show "[Message deleted]".
- Unread badge: Show when `unread_count > 0`.
- Archived: GET .../conversations/?include_archived=1, filter `archived === true` for archived section.

Fields per conversation: id, type, title, display_name, other_participant, latest_message, unread_count, archived, is_pinned, memberships, created

══════════════════════════════════════════════════════════════════
3. ARCHIVE / UNARCHIVE
══════════════════════════════════════════════════════════════════
POST /api/v1/chat/conversations/{id}/archive/   Body: { "archived": true } or { "archived": false }
OR POST /api/v1/chat/conversations/archive/     Body: { "conversation_id": 123, "archived": true }
Success: 200, { "status": "archived" } or { "status": "unarchived" }

══════════════════════════════════════════════════════════════════
4. PIN / UNPIN (conversations)
══════════════════════════════════════════════════════════════════
POST /api/v1/chat/conversations/{id}/pin/   Body: { "pinned": true } or { "pinned": false }
OR POST /api/v1/chat/conversations/pin/     Body: { "conversation_id": 123, "pinned": true }
Success: 200, { "status": "pinned" } or { "status": "unpinned" }

══════════════════════════════════════════════════════════════════
5. DELETE / LEAVE CONVERSATION
══════════════════════════════════════════════════════════════════
DELETE /api/v1/chat/conversations/{id}/
Success: 204. Show confirm dialog for groups. Refetch list.

══════════════════════════════════════════════════════════════════
6. MARK AS READ
══════════════════════════════════════════════════════════════════
When user opens a conversation: POST /api/v1/chat/conversations/{id}/mark_read/
Success: 200. Refetch conversation list so unread badge updates.

══════════════════════════════════════════════════════════════════
7. MESSAGES
══════════════════════════════════════════════════════════════════
Get messages:
- GET /api/v1/chat/conversations/{id}/messages/?limit=50&before_id=<id>
- OR GET /api/v1/chat/messages/?conversation_id={id}&limit=50&before_id=<id>

Send message:
- POST /api/v1/chat/messages/  Body: { "conversation": <id>, "body": "text" }

Message layout (IMPORTANT):
- Use `message.is_own` to align: own messages → RIGHT, received → LEFT
- Own = align-end / margin-left auto; Other = align-start

Message fields: id, conversation, sender, body, reply_to, forwarded_from, edited_at, sent_at, is_deleted, is_own, is_pinned, delivered_count, read_count, attachments, forwarded_from_detail

Read receipts (for check marks on own messages):
- delivered_count: recipients who have received the message
- read_count: recipients who have read the message
- Frontend: delivered_count==0 && read_count==0 → ✓ sent; delivered_count>0 && read_count==0 → ✓✓ grey (delivered); read_count>0 → ✓✓ blue (read)

══════════════════════════════════════════════════════════════════
8. EDIT MESSAGE
══════════════════════════════════════════════════════════════════
PATCH /api/v1/chat/messages/{id}/   Body: { "body": "new text" }
Only sender can edit. Cannot edit deleted. Show "(edited)" when edited_at is set.
Success: 200. Errors: 403, 400.

══════════════════════════════════════════════════════════════════
9. DELETE MESSAGE
══════════════════════════════════════════════════════════════════
DELETE /api/v1/chat/messages/{id}/
Only sender can delete. Soft delete: show "[Message deleted]" placeholder.

══════════════════════════════════════════════════════════════════
10. FORWARD MESSAGE
══════════════════════════════════════════════════════════════════
POST /api/v1/chat/messages/{id}/forward/   Body: { "target_conversation_id": 123 }
Success: 201, returns new message. Show "Forwarded" label when message.forwarded_from_detail exists.

══════════════════════════════════════════════════════════════════
11. PIN MESSAGE
══════════════════════════════════════════════════════════════════
POST /api/v1/chat/messages/{id}/pin/   Body: { "pinned": true } or { "pinned": false }
List pinned: GET /api/v1/chat/conversations/{id}/pinned-messages/
Shared: pinned messages appear to ALL participants. When anyone pins, all see it. Show pin icon on pinned messages.

══════════════════════════════════════════════════════════════════
12. REAL-TIME (WebSocket)
══════════════════════════════════════════════════════════════════
Connect to ws://HOST/ws/conversation/{conversation_id}/?token={JWT} when viewing a conversation.
REQUIRED for real-time pin updates in group chat: you MUST connect to this WebSocket when the user is viewing the conversation, and pass the JWT token so the connection is authenticated.

Listen for:
- "message.new" – payload = full message object, add to list
- "message.updated" – payload = full message object, replace/update by id (edit, delete, or pin/unpin)
  CRITICAL for group chat: When participant A pins a message, participants B and C must receive message.updated with is_pinned: true. Update your local message state by message id so the pin appears for everyone. Without handling this, pinned messages won't appear to others.

Alternative: If connected to ws/chat/?token={JWT} (user channel), you also receive message.updated for pin events. Handle it the same way.

══════════════════════════════════════════════════════════════════
13. RENDER RULES
══════════════════════════════════════════════════════════════════
- is_deleted or empty body → show "[Message deleted]"
- edited_at present → show "(edited)" label
- forwarded_from_detail → show "Forwarded" label
- Use body (not content) for message text

══════════════════════════════════════════════════════════════════
14. ERROR HANDLING
══════════════════════════════════════════════════════════════════
403: Access denied. 404: Conversation not found, remove from list. Network errors: show retry.
```
