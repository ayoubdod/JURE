# Frontend: stay connected to the Django backend (Jure DRF)

Use this prompt in the **frontend** repo (Cursor or team chat) to verify wiring, env, auth, and API paths match this backend.

---

## Short copy-paste prompt (Cursor / frontend)

```
Connect the frontend to the Jure Django API correctly.

1) Base URL: every REST call must use the configured API origin + `/api/v1/` prefix. Example: `http://localhost:8000/api/v1/` (no double segments like `/api/v1/api/v1/`). Put the origin in env (e.g. VITE_API_URL or NEXT_PUBLIC_API_URL) and build paths as `${API_ORIGIN}/api/v1/...`.

2) Auth: send `Authorization: Bearer <access_token>` on authenticated requests (dj-rest-auth / JWT as your app uses). On 401, clear session and redirect to login. Do not send API calls without the token after login.

3) CORS: the backend allows origins from `FRONTEND_BASE_URL` in backend `.env` plus common Vite ports (3000, 5173, 4173). If the frontend runs on another origin/port, add it to backend `FRONTEND_BASE_URL` or the backend CORS list.

4) Credentials: backend uses `CORS_ALLOW_CREDENTIALS = True`. If you use cookies or `credentials: 'include'`, ensure axios/fetch matches that and SameSite/cookie rules.

5) Smoke test: `GET ${API_ORIGIN}/api/schema/` or `GET ${API_ORIGIN}/api/v1/cases/` (with auth for protected routes) should return 200, not CORS errors in the browser Network tab.

6) WebSockets (chat): if the app uses real-time chat, point the WS client at the same host as the API (e.g. `ws://localhost:8000/...` per `chat/routing.py`), not the Vite dev server.

7) Feature docs: align feature UIs with backend docs in the backend repo under `docs/` (e.g. `FRONTEND_FINANCE_MODULE.md`, `FRONTEND_CASE_TYPES_PROMPT.md`, `BACKEND_FRONTEND_SYNC.md`).

Verify: Network tab shows requests to the API host, 401/403 handled, no mixed-content (HTTPS page calling HTTP API), and response JSON keys match serializers (often snake_case from DRF unless a custom camelCase layer exists on the frontend).
```

---

## Full checklist (manual QA)

| Check | What to verify |
|--------|----------------|
| Env | Single source of truth for API base URL; no hardcoded `localhost:8000` scattered everywhere |
| Path | All routes include `/api/v1/` where the backend defines them (`cases`, `cabinets`, `finance`, `dj-rest-auth`, etc.) |
| Auth | Token attached after login; refresh flow if you use refresh tokens |
| Errors | Parse `detail` or field errors from DRF; show user-friendly messages |
| File upload | `multipart/form-data` where required (e.g. logos); not `application/json` |
| Pagination | Match backend (`page`, `page_size` or `per_page` per endpoint) |
| Finance | Only OWNER/ADMIN; 403 message: *Access denied. Finance module requires Owner or Administrator role.* |

---

## Backend reference (this repo)

- URL entry: `core/urls.py` — includes `api/v1/cases/`, `api/v1/finance/`, `api/v1/dj-rest-auth/`, `api/v1/chat/`, etc.
- CORS / frontend origin: `core/settings.py` — `FRONTEND_BASE_URL`, `CORS_ALLOWED_ORIGINS`
- OpenAPI: `GET /api/schema/` — Swagger UI `GET /api/docs/`

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `BACKEND_FRONTEND_SYNC.md` | When to add feature prompts and template |
| `FRONTEND_FINANCE_MODULE.md` | Finance API alignment |
| Other `docs/FRONTEND_*.md` | Per-feature contracts |
