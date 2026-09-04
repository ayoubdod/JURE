# Engineering standards

JURE is a working product. Cleanups must not change user-visible behavior unless the change is the point (and is called out in the PR).

This file is the **one way**. If two patterns exist in the tree, copy the one named here, not the nearest fat file.

## Safety

- No feature rewrites disguised as cleanup.
- Do not enable TypeScript `"strict": true` for the whole app in one PR.
- Do not mass-run `ruff format` or Prettier across the repo without an explicit, format-only PR.
- Delete a file only after search shows zero imports.
- API keys (JURIA, SMTP, TURN) stay on the server. Never `VITE_` them.

## Backend (`jure-drf`)

**Copy:** `finance/` (packages), `juria/` (services), `cases/views/case_viewset.py` (thin ViewSet + mixins), `users/serializers/` / `users/views/`, `chat/serializers/` / `chat/views/`, `tasks/serializers/` / `tasks/views/`, `cabinets/serializers/` / `cabinets/views/`, `clients/serializers/` / `clients/views/`, `library/serializers/` and `library/views/` (one module per HTTP concern, public names re-exported from `__init__.py`).

**Avoid growing:** single-file dumps in `library/`. Do not expand `chat/consumers/signaling.py` in a cleanup PR.

```
app/
  models.py | models/
  serializers.py | serializers/   # HTTP in/out
  services/                       # rules, tenancy, side effects
  views.py | views/               # auth, call service, respond
  tests.py | tests/
```

- Permissions: cabinet membership + RBAC from `cabinets.permissions`. Extra checks (`IsFinanceAuthorized`, JURIA `require_*`) are additive.
- User-facing strings: gettext. Code, comments, and commit messages: English.
- Canonical URL prefix: `/api/v1/`. Keep `/api/` aliases; do not add a third mount.
- Tests: `poetry run pytest`. New business logic extracted into a service should get a test in the same change.

Ruff is configured in `pyproject.toml`. It is **not** a merge gate yet (existing code would fail a full `ruff check`). Use it on files you already touch if you want; do not reformat the world.

## Frontend (`jure-frontend`)

**Copy:** `src/App.tsx` (routing), `src/services/<domain>/api.ts`, `src/utils/axiosInstance.ts`, `src/components/case/CaseCreateModal.tsx`. Import appointment dialogs from `src/components/appointments/`. Profile UI lives in `src/components/team/TeamMemberProfile.tsx`. Consultation conversion type picker is `ConversionTypeSelector`, not the create-case `CaseTypeSelector`.

**Do not copy:** unused scaffolds, mock `setTimeout` submits, a second `CaseTypeSelector`, or 1,000-line pages as a template.

- New strings: `src/i18n` (`en` / `fr` / `ar`).
- New data access: add to `src/services/…`, not ad-hoc `fetch` in a page.
- Forms: **yup** is what existing forms use. Do not introduce new **zod** schemas until yup is gone in a dedicated PR.
- Dates: use whichever library the file already uses (`date-fns` or `dayjs`). Do not add a third.
- TanStack Query is wrapped in `App.tsx` but **not used** (`useQuery` / `useMutation` are unused). Do not add a third fetching style. New work keeps axios + `services/` until Query is adopted or removed in a later phase. Do not remove `QueryClientProvider` in a drive-by change.
- Zustand for client state that spans routes; React Context for purely visual concerns (toasts, shortcuts).

TypeScript: `strict` / `noImplicitAny` remain **false** so current sources compile. New `src/services/` code should still be typed without `any`. `@typescript-eslint/no-unused-vars` stays off so `npm run lint` matches today’s baseline.

## Docs that belong in git

- README files and this standard.
- API notes that describe **current** behavior (`jure-drf/docs/CASE_TYPES_API.md`, SMTP, finance module notes).

Do not commit agent/Cursor implementation prompts (`*_PROMPT.md`, `CURSOR_*.md`).

## PR shape

- One concern per change (docs, or delete dead files, or a single extract).
- Do not mix formatter output with logic.
- If behavior could change, say so in the PR and add or run the relevant test.
