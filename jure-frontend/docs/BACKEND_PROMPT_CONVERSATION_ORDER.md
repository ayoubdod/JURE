# Backend Prompt: Conversation List Order – Last/Newest at Top

## Problem
The most recently active conversation does not appear at the top of the chat sidebar. Users expect the last conversation (by creation or last message) to be first.

## Change Summary
- **Frontend:** Sorts the conversation list by `latest_message.sent_at` (desc) when merging real-time updates. New conversations are prepended. Uses functional state updater to avoid stale closures.
- **Expectation:** `GET /chat/conversations/` should return conversations ordered by most recent activity (newest first).

## Affected Areas
- **Endpoint:** `GET /chat/conversations/`
- **Response:** `Conversation[]` – order matters

## Frontend Expectations
1. **Initial load:** Conversations returned in **descending order by last activity** (most recent first).
2. **Ordering field:** Use `latest_message.sent_at` or `created` – whichever is more recent for each conversation.
3. **New conversations:** When created via `POST /chat/conversations/`, the new conversation is the most recent and should appear first on the next list fetch.

## Backend Checklist – Please Verify
- [ ] `GET /chat/conversations/` returns conversations ordered by **most recent activity first** (e.g. `ORDER BY latest_message.sent_at DESC NULLS LAST, created DESC`).
- [ ] Newly created conversations (no messages yet) are ordered by `created` desc.
- [ ] When a new message is sent, that conversation moves to the top on the next list fetch (or via WebSocket sync).
- [ ] `latest_message` is populated on each conversation in the list response.

## Optional: Suggested Backend Changes
- Add explicit `ordering` to the conversations list serializer/view (e.g. Django: `Meta.ordering = ['-updated']` or subquery for latest message).
- Ensure `latest_message` includes `sent_at` so the frontend can sort correctly when merging real-time updates.
