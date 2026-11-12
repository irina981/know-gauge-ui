# KnowGauge UI

Web interface for the [KnowGauge](https://github.com/irina981/know-gauge) backend: organise topics, upload and ingest PDFs, generate
multiple-choice tests and review the generated questions.

## Stack

| Concern | Library | Docs |
|---|---|---|
| Language / build | TypeScript + [Vite](https://vite.dev) | |
| UI | [React 18](https://react.dev) | react.dev/learn |
| Components & styling | [Mantine 7](https://mantine.dev) | mantine.dev/core/button (every component has a page with examples) |
| Loading & saving data | [TanStack Query 5](https://tanstack.com/query/latest) | `useQuery` for reads, `useMutation` for writes |
| Pages / URLs | [React Router 6](https://reactrouter.com/6.30.0) | |
| API types | [openapi-typescript](https://openapi-ts.dev) + openapi-fetch | generated from the backend's OpenAPI spec |
| Icons | [Tabler icons](https://tabler.io/icons) | |

There is no global state library and almost no CSS: Mantine components are styled through props
(`<Text size="sm" c="dimmed">`), and server data lives in TanStack Query's cache.

## Running locally

Prerequisites: Node.js 22+ and the backend running on `localhost:8080`
(see `know-gauge/local-development/README.md`).

```bash
npm install
npm run dev        # http://localhost:5173 — /api is forwarded to localhost:8080
```

To use a backend elsewhere: `BACKEND_URL=http://host:8080 npm run dev`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build static files into `dist/` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from the running backend (`/v3/api-docs`) |

**After any backend API change**, run `npm run gen:api` and then `npm run build`. The type checker then points
at every place in the UI that no longer matches the API.

## Project layout

```
src/
  main.tsx            entry point (loads Mantine CSS, renders <App/>)
  app/                App.tsx (providers + routes), Layout.tsx (header/nav), theme.ts, queryClient.ts
  api/                everything that talks to the backend
    schema.d.ts         generated — do not edit
    client.ts           typed fetch client + ApiError
    types.ts            short names for DTOs (TopicDto, TestDto, ...)
    topics.ts, documents.ts, tests.ts, review.ts   query/mutation hooks per area
  features/           one folder per screen area
    library/            Library page (topic tree + documents)
    topics/             topic tree, create/rename dialog, JSON tree import
    documents/          upload dropzone, documents table
    tests/              tests list, generate-test form
    review/             test review page, question cards, history, activity, LLM calls
  shared/             enum labels/colours, formatting, small shared components
```

### How a screen gets its data

1. A hook in `src/api/*.ts` wraps one endpoint, e.g. `useTestQuestions(testId)`.
2. The page calls the hook and renders `isLoading` / `error` / `data`.
3. Changes go through a mutation hook (e.g. `useAcceptFix`), which tells TanStack Query which cached data is
   now stale (`invalidateQueries`), so the affected lists reload automatically.
4. Failed mutations show a notification with the backend's error message (`app/queryClient.ts`).

### Adding a page

1. Create `src/features/<area>/<Name>Page.tsx`.
2. Add a route in `src/app/App.tsx` and, if needed, a nav entry in `src/app/Layout.tsx`.
3. Add query hooks for new endpoints in `src/api/`.

## Docker

The image builds the app and serves it with nginx, which also forwards `/api/` to the backend
(`BACKEND_URL`, default `http://knowgauge-service:8080`).

```bash
# backend stack first (from know-gauge/): docker compose -f local-development/docker-compose.yml up -d
docker compose up --build    # UI on http://localhost:3000
```

## Notes

- `package.json` overrides `rollup` with `@rollup/wasm-node`. Windows Application Control blocks Rollup's
  native `.node` binary on the dev machine; the WebAssembly build is slightly slower but needs no native code.
  Remove the override if your machine allows native modules.
- Ingestion, test generation and question regeneration are synchronous on the server and can take minutes.
  The UI shows a waiting state; the proxies (Vite and nginx) allow up to 10 minutes.
- There is no login yet: the backend uses a fixed tenant and user in the `dev`/`docker` profiles.
- Test attempts and scoring are not part of the UI yet.
