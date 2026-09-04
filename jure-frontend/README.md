# JURE web (`jure-frontend`)

Vite + React 18 + TypeScript UI for JURE.

## Requirements

- Node.js **20+**
- npm
- API running (see [`../jure-drf/README.md`](../jure-drf/README.md)), default `http://localhost:8000`

## Setup

```bash
cd jure-frontend
copy .env.example .env   # Windows; macOS/Linux: cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:3000` (Vite `server.port` is 3000).

`VITE_API_URL` is the **API origin only** (`http://localhost:8000`). The client appends `/api/v1/`. Do not put secrets in Vite env vars. JURIA keys stay on Django.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Vite server |
| `npm run build` | Production bundle |
| `npm run lint` | ESLint |
| `npm run i18n:audit` | Unused / missing message keys |

## Layout — which pattern to copy

| Path | Role |
|---|---|
| `src/pages/` | Route-level screens |
| `src/components/<domain>/` | Feature UI (`case`, `chat`, `finance`, …) |
| `src/components/ui/` | shadcn/Radix primitives |
| `src/services/<domain>/api.ts` | HTTP wrappers (axios) |
| `src/stores/` | Zustand |
| `src/i18n/` | Typed catalogs (`en` / `fr` / `ar`) |
| `src/App.tsx` | Router and providers |

New UI strings go through `src/i18n`, not hardcoded French or English in JSX.

Golden examples: `src/App.tsx`, `src/utils/axiosInstance.ts`, `src/components/case/CaseCreateModal.tsx`.

## TypeScript and lint

`strict` is **off** today so the existing app keeps compiling. Do not flip `tsconfig` to `"strict": true` in a drive-by PR. New code in `src/services/` should still avoid `any`. Details: [`../docs/ENGINEERING.md`](../docs/ENGINEERING.md).
