# Backend–Frontend Sync Process

How to keep the frontend and backend aligned when APIs or contracts change.

## General Flow

1. **Backend changes** – When the backend adds or changes an API, create or update docs in `docs/` (e.g. `FRONTEND_CHAT_CONVERSATION_LIST.md`).
2. **Frontend updates** – Update the frontend to match the new contract (endpoints, request/response shape, errors).
3. **Backend prompts** – When the frontend depends on backend behavior, create `docs/BACKEND_PROMPT_<topic>.md` so the backend team can verify or implement.

## Doc Types

| Doc | Purpose |
|-----|---------|
| `FRONTEND_*.md` | Spec for frontend implementation (what the frontend expects from the API) |
| `BACKEND_PROMPT_*.md` | Checklist for the backend team to verify or fix behavior |
| `FRONTEND_BACKEND_SYNC_PROMPT_TEMPLATE.md` | Template for creating new backend prompts |

## Verification Checklist

When updating the frontend for backend changes:

- [ ] **Endpoints** – Use the correct URL and HTTP method
- [ ] **Request format** – JSON vs multipart/form-data; correct field names
- [ ] **Response format** – Handle the expected shape; support both snake_case and camelCase if needed
- [ ] **Errors** – Handle 400, 403, 404, 500 with appropriate UI feedback
- [ ] **UI** – Display new fields (e.g. `display_name`, `unread_count`) and respect ordering

## Related Docs

| Doc | Purpose |
|-----|---------|
| `FRONTEND_CHAT_CONVERSATION_LIST.md` | Chat: archive, pin, delete, order, display_name, unread |
| `FRONTEND_BACKEND_SYNC_PROMPT_TEMPLATE.md` | Template for backend prompts |
| `BACKEND_PROMPT_CABINET_LOGO_REFRESH.md` | Cabinet logo refresh |
| `BACKEND_PROMPT_CONVERSATION_ORDER.md` | Conversation list order |
| `BACKEND_PROMPT_CHAT_ARCHIVE_PIN.md` | Chat archive, pin, delete |
| `CURSOR_PROMPT_BACKEND_CHAT_VERIFY.md` | **Cursor prompt** – Backend chat API verification |
