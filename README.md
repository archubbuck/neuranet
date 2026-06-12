# Neuranet

Interactive topic-network visualizer. An Express + SQLite backend ingests documents (manual upload or Reddit fetch), derives topic clusters/nodes/edges from keywords, and an Angular frontend renders the network with management, search, and reporting screens.

## Stack

- **Frontend**: Angular 22 (zoneless, signals, standalone components, OnPush) — `src/`
- **Backend**: Express 5 + better-sqlite3 — `server/`
- **Tooling**: pnpm 11 (pinned via `packageManager`), Node 22.12+, Vitest

## Getting started

```bash
pnpm install
pnpm start          # runs API (:3000) + Angular dev server (:4200) via concurrently
```

Or independently:

```bash
pnpm start:api      # Express + SQLite on http://localhost:3000
pnpm start:ui       # Angular dev server on http://localhost:4200
```

Open `http://localhost:4200/`. The dev server proxies `/api/*` to the backend via [proxy.conf.json](proxy.conf.json).

## Data

- SQLite database at `data/neuranet.db` (git-ignored). Override the path with the `NEURANET_DB_PATH` env var (`:memory:` for ephemeral runs).
- Seed sample data: `node scripts/seed.mjs` (API must be running).
- Documents can be added via the UI (paste text) or by configuring a Reddit source and fetching.

## Testing

```bash
pnpm test           # frontend unit tests (Vitest via ng test)
pnpm test:server    # backend tests (Vitest, in-memory SQLite)
```

## Building

```bash
pnpm exec ng build  # production build into dist/
```

## Project layout

```
server/         Express API, schema, derivation logic, backend tests
src/app/
  core/         app-wide services (toast, viewport)
  data/         types, ApiService, AppStore (signals)
  shell/        app shell + sidebar layout
  screens/      routed feature screens
  ui/           reusable presentational components, design tokens, icons
scripts/        seed script
data/           SQLite database (git-ignored)
```

