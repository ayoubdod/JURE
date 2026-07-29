# Chat: Conversation List – Frontend Implementation

This doc describes how the frontend implements the chat conversation list to align with backend API changes (archive, pin, delete, order, display_name, unread).

## API Endpoints

| Action | Method | Endpoint | Request | Response |
|--------|--------|----------|---------|----------|
| List conversations | GET | `/chat/conversations/` | `?include_archived=1` (optional) | `Conversation[]` |
| Create conversation | POST | `/chat/conversations/` | JSON `{ participants, title?, type? }` | `Conversation` |
| Update conversation | PATCH | `/chat/conversations/{id}/` | JSON `{ archived?, pinned? }` | `Conversation` |
| Delete conversation | DELETE | `/chat/conversations/{id}/` | — | 204 |
| Send message | POST | `/chat/messages/` | multipart/form-data | `Message` |
| Mark read | POST | `/chat/messages/{id}/mark_read/` | — | — |

## Conversation Response Shape

```ts
type Conversation = {
  id: number;
  type: 'direct' | 'group';
  title: string;
  display_name?: string;   // Backend-computed: direct = peer name, group = title
  archived?: boolean;     // Per-membership: current user has archived
  pinned?: boolean;      // Per-membership: current user has pinned
  memberships: ConversationMembership[];
  latest_message: Message;
  unread_count: number;   // From API (snake_case); unreadCount also supported
  created: string;
}
```

## Frontend Behavior

### 1. Archive
- **Default:** `GET /chat/conversations/` (no params) returns only non-archived conversations.
- **Archived section:** When user expands "Archived", `GET /chat/conversations/?include_archived=1` fetches all (active + archived). Archived items are shown in a collapsible section.
- **Actions:** Archive (moves to Archived), Unarchive (moves back to main list). Both use `PATCH /chat/conversations/{id}/` with `{ archived: true }` or `{ archived: false }`.

### 2. Pin
- **Pinned at top:** Pinned conversations appear first, then sorted by `latest_message.sent_at` desc.
- **Actions:** Pin / Unpin via `PATCH /chat/conversations/{id}/` with `{ pinned: true }` or `{ pinned: false }`.

### 3. Delete
- **Action:** `DELETE /chat/conversations/{id}/` – removes from both active and archived lists.

### 4. Conversation order
- **Sort:** Pinned first, then by `latest_message.sent_at` (or `created`) desc.
- New conversations are prepended. Real-time updates re-sort when `latest_message` changes.

### 5. Display name
- **Prefer `display_name`** – Used in list, header, context panel.
- **Fallback** – Direct: peer name; Group: `title`.

### 6. Unread count
- **Prefer API value** – `unread_count` or `unreadCount`.
- **Fallback** – Compute from `chatStore.notifications`.

### 7. Message send (multipart)
- **Endpoint:** `POST /chat/messages/`
- **Fields:** `conversation`, `body`, `attachments` (File[])

## Error Handling

- **List:** On error, list is set to `[]`; UI shows "No conversations found".
- **Archive/Pin/Delete:** Errors surfaced via axios rejection; consider adding toast feedback.

## Related Files

- `src/services/conversations/api.ts` – API calls
- `src/services/conversations/typing.d.ts` – Types
- `src/components/chat/ConversationList.tsx` – List UI (archive, pin, delete actions)
- `src/components/chat/ChatWindow.tsx` – Chat header
- `src/components/chat/ContextPanel.tsx` – Context panel
- `src/pages/Conversations.tsx` – Page logic
