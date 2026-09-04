# JURE API (`jure-drf`)

Django REST + Channels backend for JURE.

## Requirements

- Python **3.12+** (see `pyproject.toml`)
- [Poetry](https://python-poetry.org/)
- SQLite is the local default. PostgreSQL via `DATABASE_URL` for staging/production.

## Setup

```bash
cd jure-drf
copy .env.example .env   # Windows; macOS/Linux: cp .env.example .env
poetry install
poetry run python manage.py migrate
```

Optional: `poetry run python manage.py createsuperuser`

Copy only from `.env.example`. Never commit `.env`.

## Run

HTTP-only (no chat/calls WebSockets):

```bash
poetry run python manage.py runserver
```

Full local app (HTTP + WebSockets) — this is what the frontend expects:

```bash
poetry run daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

| URL | Purpose |
|---|---|
| `http://localhost:8000/api/v1/` | REST API |
| `http://localhost:8000/api/docs/` | Swagger |
| `http://localhost:8000/api/schema/` | OpenAPI schema |
| `http://localhost:8000/admin/` | Django admin |
| `http://localhost:8000/health/` | Health check |

French command notes (same project): [`RUN_PROJECT.md`](RUN_PROJECT.md).

## Settings

`DJANGO_SETTINGS_MODULE` defaults to `core.settings.local` in `manage.py`.

| Module | Use |
|---|---|
| `core.settings.local` | Laptop / `runserver` / Daphne locally |
| `core.settings.staging` | Docker / Railway |
| `core.settings.production` | Production hardening |

Do not set `core.settings.local` on Railway.

## Layout — which pattern to copy

Newer domains are the template. Match **`finance/`** or **`juria/`** (packages) or **`cases/views/`** (ViewSet + mixins + `services.py`).

```
app/
  models.py or models/
  serializers.py or serializers/
  services/          # business rules, tenancy, side effects
  views.py or views/ # thin HTTP
  tests.py or tests/
```

- Views: auth, call a service, return a response.
- Serializers: HTTP shape and field validation, not invoice math or JURIA calls.
- Permissions: cabinet membership + RBAC (`cabinets.permissions`). Domain extras (finance, JURIA) are additions, not a second default.

Flat apps (`chat/`, `users/`, `clients/`, …) are historical. Do not grow them; extract into `services/` when you touch a hotspot (later phases).

## Tests

```bash
poetry run pytest
```

`pytest.ini` sets `DJANGO_SETTINGS_MODULE = core.settings.local`. Prefer tests next to the app (`tests.py` or `tests/`).

Lint (optional, not a merge gate yet):

```bash
poetry run ruff check .
```

Do not run `ruff format` across the tree unless a dedicated cleanup is agreed — it would churn every file without changing product behavior, and it is easy to mix with real diffs.

## Apps (domain)

`users`, `cabinets`, `clients`, `cases`, `tasks`, `case_calendar`, `library`, `finance`, `chat`, `notifications`, `juria`, `legal_deadlines`, `conflict_checks`, `research_notes`, `dashboard`, `commons`, plus `jurisdictions`, `lawyers`, `subscriptions`.
