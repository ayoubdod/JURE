# Frontend prompt – Chat message actions (Edit, Delete, Forward, Pin)

**Copy the prompt below and paste it into Cursor (frontend project) to implement message edit, delete, forward, and pin.**

---

## Copy-paste prompt

```
Implement chat message actions: edit, delete, forward, and pin.

Base URL: ${API_BASE}/api/v1/chat/

══════════════════════════════════════════════════════════════════
1. EDIT MESSAGE
══════════════════════════════════════════════════════════════════
- **Endpoint:** PATCH /api/v1/chat/messages/{id}/
- **Body:** { "body": "new text content" }
- **Who:** Only the sender can edit.
- **Rules:** Cannot edit deleted messages.
- **Success:** 200, returns full message object.
- **Errors:** 403 "Only the sender can edit this message"; 400 "Cannot edit a deleted message".

UI:
- Show "Edit" on long-press or message menu for own messages only.
- Inline edit or modal: prefill with current body, save → PATCH.
- Display edited_at on edited messages (e.g. "(edited)" label).

══════════════════════════════════════════════════════════════════
2. DELETE MESSAGE
══════════════════════════════════════════════════════════════════
- **Endpoint:** DELETE /api/v1/chat/messages/{id}/
- **Who:** Only the sender can delete.
- **Success:** 204 No Content.
- **Behavior:** Soft delete. API returns body="" and is_deleted=true for deleted messages.

UI:
- Show "Delete" on message menu for own messages only.
- Confirm: "Delete this message?" → DELETE.
- Render deleted messages as "[Message deleted]" or placeholder. Keep message bubble for timeline continuity.
- Check: message.is_deleted || !message.body → show placeholder.
- For latest_message in conversation list: if is_deleted show "[Message deleted]", else if empty body show "[Attachment]".

══════════════════════════════════════════════════════════════════
3. FORWARD MESSAGE
══════════════════════════════════════════════════════════════════
- **Endpoint:** POST /api/v1/chat/messages/{id}/forward/
- **Body:** { "target_conversation_id": 123 }  (also accepts "conversation_id")
- **Who:** Any participant who can see the message and is member of target conversation.
- **Success:** 201, returns the new forwarded message object.

UI:
- Show "Forward" on message menu (long-press or ⋮).
- Open conversation picker; user selects target conversation.
- POST forward with target_conversation_id.
- Optionally navigate to target conversation and show the new message.

Forwarded message display:
- message.forwarded_from_detail exists when message was forwarded.
- Show "Forwarded" label and optionally original info:
  - forwarded_from_detail.sender (user id)
  - forwarded_from_detail.body (empty if original was deleted)
  - forwarded_from_detail.sent_at

══════════════════════════════════════════════════════════════════
4. PIN MESSAGE
══════════════════════════════════════════════════════════════════
- **Endpoint:** POST /api/v1/chat/messages/{id}/pin/
- **Body:** { "pinned": true } or { "pinned": false } (also accepts "isPinned")
- **Success:** 200, { "status": "pinned" } or { "status": "unpinned" }
- **Shared:** Pinned messages appear to ALL participants. When anyone pins, all see it.

List pinned messages in conversation:
- **Endpoint:** GET /api/v1/chat/conversations/{id}/pinned-messages/
- **Response:** Array of messages pinned by current user.
- Use to show "Pinned messages" section/drawer in conversation view.

UI:
- Show "Pin" / "Unpin" on message menu. Toggle based on message.is_pinned.
- In message list: show pin icon for pinned messages (e.g. 📌).
- Optional: header or drawer "Pinned" showing GET pinned-messages; tap to jump to message.

══════════════════════════════════════════════════════════════════
5. MESSAGE RESPONSE FIELDS (updated)
══════════════════════════════════════════════════════════════════
Each message from API/WebSocket:
  id, conversation, sender, body
  reply_to, forwarded_from
  edited_at         ← set when message was edited (ISO datetime or null)
  sent_at
  is_deleted        ← true = show "[Message deleted]"
  is_own            ← true if current user sent
  is_pinned         ← true if current user pinned this message
  attachments
  forwarded_from_detail  ← { id, sender, body, sent_at } when forwarded, else null

══════════════════════════════════════════════════════════════════
6. REAL-TIME (WebSocket)
══════════════════════════════════════════════════════════════════
- Listen for "message.updated" in addition to "message.new".
- Payload: full message object (same shape as REST).
- On message.updated: replace/update message in local state by id.
  - If is_deleted: show placeholder.
  - If body changed: show new body, "(edited)".

══════════════════════════════════════════════════════════════════
7. IMPLEMENTATION SUMMARY
══════════════════════════════════════════════════════════════════
1. Message context menu: Edit, Delete, Forward, Pin/Unpin (based on is_pinned).
2. Edit: PATCH messages/{id} with body.
3. Delete: DELETE messages/{id} + confirm.
4. Forward: POST messages/{id}/forward/ with target_conversation_id; show conversation picker.
5. Pin: POST messages/{id}/pin/ with pinned: true|false.
6. Pinned list: GET conversations/{id}/pinned-messages/ for "Pinned" section.
7. Render: is_deleted → placeholder; edited_at → "(edited)"; forwarded_from_detail → "Forwarded" label.
8. WebSocket: handle message.updated to update message in real time.
```

---

## Quick checklist

| Item | Status |
|------|--------|
| PATCH messages/{id} for edit (body only) | ☐ |
| DELETE messages/{id} for delete | ☐ |
| POST messages/{id}/forward/ with target_conversation_id | ☐ |
| POST messages/{id}/pin/ with pinned | ☐ |
| GET conversations/{id}/pinned-messages/ | ☐ |
| Message menu: Edit, Delete, Forward, Pin | ☐ |
| Show [Message deleted] for is_deleted | ☐ |
| Show (edited) when edited_at present | ☐ |
| Forwarded label when forwarded_from_detail | ☐ |
| WebSocket message.updated handler | ☐ |
