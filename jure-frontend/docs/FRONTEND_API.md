# Frontend ↔ Django API

## Base URL

- **Origin** `API_ORIGIN` comes from env (`VITE_API_URL`, `VITE_API_BASE_URL`, `REACT_APP_API_URL`, `NEXT_PUBLIC_API_URL` — first set wins).
- **REST prefix** is always a single segment: **`${API_ORIGIN}/api/v1/`** (`export const API_BASE` in `src/config/api.ts`).
- Relative paths in services (e.g. `/cases/`) resolve to `http://host:8000/api/v1/cases/`.

## Auth

- `POST` login stores tokens in Zustand; **`axios`** (`src/utils/axiosInstance.ts`) sends **`Authorization: Bearer <access_token>`** on every request when a token exists.
- **401**: refresh token is tried once; on failure the session is cleared and the browser is redirected to **`/signin`**.
- **403** (e.g. finance): session is **not** cleared; handle in the UI.

## Cookies / CORS

- Axios uses **`withCredentials: true`** for Django CORS + credentials. Ensure `FRONTEND_BASE_URL` (or your dev port) is allowed in the backend.

## Smoke tests

- OpenAPI: `GET ${API_ORIGIN}/api/schema/` (or your project’s schema path).
- Authenticated: `GET ${API_ORIGIN}/api/v1/cases/` with `Authorization: Bearer …`.

## WebSockets

- Chat/calls use **`WS_HOST`** from `src/config/api.ts` (same **host** as the API, not the Vite port). Override with **`VITE_WS_BASE`** if needed.

## Backend feature docs

Align feature UIs with the backend repo under `docs/` (e.g. `FRONTEND_FINANCE_MODULE.md`, `FRONTEND_CASE_TYPES_PROMPT.md`, `BACKEND_FRONTEND_SYNC.md`).

## JSON

- DRF serializers usually return **snake_case**; map in the UI when displaying or when sending PATCH bodies.
