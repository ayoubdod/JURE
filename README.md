# JURE

Legal practice software for Moroccan law firms: matters (cases), clients, calendar, chat and calls, finance, document library, and JURIA (AI research, server-side only).

This repository is a two-package app:

| Package | Path | Stack |
|---|---|---|
| API | [`jure-drf/`](jure-drf/) | Django 5, DRF, Channels (Daphne) |
| Web | [`jure-frontend/`](jure-frontend/) | React 18, TypeScript, Vite, Tailwind |

How we structure new code: [`docs/ENGINEERING.md`](docs/ENGINEERING.md).

## Run locally

You need **two terminals**. Defaults: API `http://localhost:8000`, web `http://localhost:3000`.

### 1. API (`jure-drf`)

Python 3.12+, [Poetry](https://python-poetry.org/), Redis only if you turn off the in-memory channel layer.

```bash
cd jure-drf
copy .env.example .env   # Windows; on macOS/Linux: cp .env.example .env
poetry install
poetry run python manage.py migrate
poetry run daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

Use Daphne, not `runserver`, if you need chat, presence, or calls (WebSockets).

- API: `http://localhost:8000/api/v1/`
- Swagger: `http://localhost:8000/api/docs/`
- Admin: `http://localhost:8000/admin/`
- Health: `http://localhost:8000/health/`

More detail: [`jure-drf/README.md`](jure-drf/README.md).

### 2. Web (`jure-frontend`)

Node.js 20+ (npm).

```bash
cd jure-frontend
copy .env.example .env   # Windows; on macOS/Linux: cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. `VITE_API_URL` must point at the API origin (`http://localhost:8000`), without `/api/v1`.

## Canonical API

Prefer **`/api/v1/`**. Some routes are also mounted under `/api/` as aliases. Do not add a third prefix.

## Tests

```bash
cd jure-drf
poetry run pytest
```

The frontend has no automated test runner yet; do not add a new framework without updating `docs/ENGINEERING.md`.

## What not to do

- Do not put API keys in the frontend. JURIA keys stay on the Django service.
- Do not commit `.env` files.
- Do not copy Cursor/agent prompt dumps into this repo.
