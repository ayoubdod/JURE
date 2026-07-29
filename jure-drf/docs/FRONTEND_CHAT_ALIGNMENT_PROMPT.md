# Frontend alignment prompt – Chat

**Copy the prompt below and paste it into Cursor (frontend project) or share with the frontend team.**

---

## Copy-paste prompt

```
Align the chat frontend with the backend. Implement or fix these items:

══════════════════════════════════════════════════════════════════
1. API BASE
══════════════════════════════════════════════════════════════════
- All chat endpoints: `${API_BASE}/api/v1/chat/` (include v1, not api/chat)

══════════════════════════════════════════════════════════════════
2. CONVERSATION LIST
══════════════════════════════════════════════════════════════════
- **Order:** Render in exact order returned. Do NOT re-sort. Backend returns: pinned first, then by most recent activity.
- **Title:** Use `display_name` (direct = peer name, group = title). Fallback: `other_participant?.full_name` or `title`.
- **Preview:** `latest_message.body` under the name. If body empty but latest_message exists: show "[Attachment]".
- **Unread badge:** Show when `unread_count > 0`.
- **Archived section:** Fetch with `GET .../conversations/?include_archived=1`, filter `archived === true`.

══════════════════════════════════════════════════════════════════
3. ARCHIVE / UNARCHIVE
══════════════════════════════════════════════════════════════════
Use any of these (prefer B if URL with id causes issues):

A) POST /api/v1/chat/conversations/{id}/archive/
   Body: { "archived": true } or { "archived": false }

B) POST /api/v1/chat/conversations/archive/   ← ID in body, no id in URL
   Body: { "conversation_id": 123, "archived": true }
   (Backend also accepts "id" instead of "conversation_id")

C) PATCH /api/v1/chat/conversations/{id}/
   Body: { "archived": true }

Success: 200, { "status": "archived" } or { "status": "unarchived" }
After success: refetch list or remove from main list. For Archived section: show "Unarchive" → { "archived": false }.

══════════════════════════════════════════════════════════════════
4. PIN / UNPIN
══════════════════════════════════════════════════════════════════
Use any of these (prefer B if URL with id causes issues):

A) POST /api/v1/chat/conversations/{id}/pin/
   Body: { "pinned": true } or { "pinned": false }

B) POST /api/v1/chat/conversations/pin/   ← ID in body, no id in URL
   Body: { "conversation_id": 123, "pinned": true }

C) PATCH /api/v1/chat/conversations/{id}/
   Body: { "is_pinned": true } or { "is_pinned": false }

Success: 200, { "status": "pinned" } or { "status": "unpinned" }
After success: refetch list. Use `is_pinned` from list response for UI state.

══════════════════════════════════════════════════════════════════
5. RENAME GROUP (group chats only)
══════════════════════════════════════════════════════════════════
Use any of these:

A) POST /api/v1/chat/conversations/{id}/rename/
   Body: { "title": "New Group Name" }
   (Backend also accepts "name" instead of "title")

B) PATCH /api/v1/chat/conversations/{id}/
   Body: { "title": "New Group Name" }

Success: 200, returns full conversation object (use display_name / title for UI).
- Only group conversations can be renamed (direct chats use participant names).
- WebSocket: Listen for type "conversation.updated" to update list in real time.

══════════════════════════════════════════════════════════════════
6. GROUP ICON (group chats only)
══════════════════════════════════════════════════════════════════
Suggested icons: GET /api/v1/chat/conversations/suggested-icons/
  Returns: [{ id, emoji, label }, ...] e.g. { id: "legal", emoji: "⚖️", label: "Legal" }

Update icon – two options:

A) Pick preset: PATCH /api/v1/chat/conversations/{id}/
   Body (JSON): { "icon_preset": "legal" }

B) Upload image: PATCH /api/v1/chat/conversations/{id}/
   Content-Type: multipart/form-data
   Form: icon = <file>  (image)

Success: 200, returns full conversation (icon_url, icon_preset, icon_preset_emoji).
- Use icon_url when set (custom image). Else use icon_preset_emoji (preset).
- WebSocket: Listen for conversation.updated when icon changes.

══════════════════════════════════════════════════════════════════
7. DELETE / LEAVE
══════════════════════════════════════════════════════════════════
- DELETE /api/v1/chat/conversations/{id}/
- For groups: show confirm dialog.
- Success: 204 No Content. Refetch list.

══════════════════════════════════════════════════════════════════
8. MARK AS READ
══════════════════════════════════════════════════════════════════
- When user opens a conversation: POST /api/v1/chat/conversations/{id}/mark_read/
- After success: refetch conversation list so unread badge updates.

══════════════════════════════════════════════════════════════════
9. MESSAGE DISPLAY
══════════════════════════════════════════════════════════════════
- API returns `body` (not `content`). Use: `message.body || message.content`.
- WebSocket new messages: `message.body` or `message.content`.
- **Layout:** Use `message.is_own` (or sender === currentUserId) to align:
  - Own messages → RIGHT (align-end / margin-left auto)
  - Received messages → LEFT (align-start)

══════════════════════════════════════════════════════════════════
10. CONVERSATION RESPONSE FIELDS
══════════════════════════════════════════════════════════════════
Each conversation from GET /api/v1/chat/conversations/:
  id, type, title
  icon_preset       ← preset key (group chats)
  icon_image        ← URL or null (group chats)
  icon_url          ← full URL of custom icon, null if preset
  icon_preset_emoji ← emoji for preset (e.g. "👥") when no custom icon
  display_name      ← use for nav title
  other_participant ← { full_name, ... } for direct chats
  latest_message    ← { body, sender, created, ... }
  unread_count      ← number
  archived          ← boolean (current user)
  is_pinned         ← boolean (current user)
  memberships, created

══════════════════════════════════════════════════════════════════
11. PRESENCE (Online Indicators / Green Dots)
══════════════════════════════════════════════════════════════════
WebSocket: ws/chat/ (or ws/chat/?token=<JWT>)

On connection.established, payload includes:
  notifications        ← array of message notifications
  online_user_ids       ← [1, 2, 3] user IDs currently connected to chat WS
  online_member_ids     ← same (alias for cabinet member matching)
  online                ← fallback array

On presence.update (when someone connects/disconnects):
  payload: { online_user_ids: [...], online_member_ids: [...], online: [...] }

Frontend: Show member avatars under chat search. Members in online_user_ids get
a green dot. Disconnected members have no dot. Match by user.id or cabinet_member.user_id.

══════════════════════════════════════════════════════════════════
12. REQUIRED HEADERS
══════════════════════════════════════════════════════════════════
- Authorization: Bearer <token>
- Content-Type: application/json (for POST/PATCH with body)

══════════════════════════════════════════════════════════════════
13. ERROR HANDLING
══════════════════════════════════════════════════════════════════
- 403: Show "Access denied" or similar.
- 404: Remove from list, show toast "Conversation not found".
- Network errors: Show retry option.

══════════════════════════════════════════════════════════════════
14. REAL-TIME (WebSocket)
══════════════════════════════════════════════════════════════════
- On new message: refetch list or move conversation to top.
- Ensure unread_count and latest_message update.

══════════════════════════════════════════════════════════════════
15. TROUBLESHOOTING "Could not archive/pin"
══════════════════════════════════════════════════════════════════
- Use Option B (id in body): POST .../archive/ or .../pin/ with { conversation_id: id }.
- Ensure API base is api/v1/chat.
- Ensure Authorization and Content-Type headers are set.
- Backend accepts camelCase: isArchived, isPinned (optional).
```

---

## Quick checklist

| Item | Status |
|------|--------|
| API base = `api/v1/chat` | ☐ |
| Use `display_name` for title | ☐ |
| Use `latest_message.body` for preview | ☐ |
| Show `unread_count` badge | ☐ |
| Render in backend order (no re-sort) | ☐ |
| Archive: use Option B if Option A fails | ☐ |
| Pin: use Option B if Option A fails | ☐ |
| Rename group (group chats only) | ☐ |
| Group icon: presets + upload | ☐ |
| Delete/leave + confirm | ☐ |
| Mark as read on open + refetch | ☐ |
| Use `body` for message content | ☐ |
| Headers: Bearer token + Content-Type | ☐ |
| Presence: green dots from online_user_ids | ☐ |
