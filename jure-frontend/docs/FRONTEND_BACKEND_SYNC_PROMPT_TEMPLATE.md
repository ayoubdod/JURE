# Frontend–Backend Sync: Prompt Template

When making frontend changes that affect the backend (APIs, contracts, auth, etc.), use this template to create a prompt for the backend team. This keeps both sides aligned.

---

## How to Use
1. Copy the template below.
2. Fill in the **Change Summary** and **Backend Checklist**.
3. Save as `docs/BACKEND_PROMPT_<feature_name>.md`.
4. Share with the backend team or add to your sync process.

---

## Template

```markdown
# Backend Prompt: [Feature/Issue Name]

## Change Summary
[Brief description of what changed on the frontend and why]

## Affected Areas
- **Endpoint(s):** [e.g. PATCH /api/v1/users/me/]
- **Request format:** [e.g. JSON, multipart/form-data]
- **Response format:** [e.g. User object with fields X, Y, Z]

## Frontend Expectations
[What the frontend expects from the backend – fields, status codes, error shapes]

## Backend Checklist – Please Verify
- [ ] [Specific item 1]
- [ ] [Specific item 2]
- [ ] [Specific item 3]

## Error Handling
- **403:** [Expected meaning and when it occurs]
- **404:** [Expected meaning and when it occurs]
- **400:** [Validation error format – e.g. `{ field_name: ["error message"] }`]

## Optional: Suggested Backend Changes
[If you have concrete suggestions for the backend]
```

---

## When to Create a Backend Prompt

| Frontend change | Create prompt? |
|-----------------|----------------|
| New API endpoint usage | Yes |
| Changed request/response shape | Yes |
| New error handling (403, 404, etc.) | Yes |
| Auth or permission changes | Yes |
| File upload (logo, avatar, documents) | Yes |
| Cache-busting or URL handling | Yes |
| Purely UI/UX (no API impact) | No |

---

## Existing Backend Prompts
- `BACKEND_PROMPT_CABINET_LOGO_REFRESH.md` – Cabinet logo not refreshing after update
- `BACKEND_PROMPT_CONVERSATION_ORDER.md` – Conversation list order (last/newest at top)

---

## Rule: Always Provide a Backend Prompt
When making frontend changes that affect the backend (APIs, contracts, ordering, new fields), **always** create or update a `docs/BACKEND_PROMPT_*.md` file so the backend team can verify or implement the required behavior. This keeps both sides adequate and in sync.
