# Neuranet

Interactive topic-network visualizer. An Express + Drizzle ORM backend (SQLite for dev, Postgres for production) ingests documents (manual upload or Reddit fetch), derives topic clusters/nodes/edges from keywords, and an Angular frontend renders the network with management, search, and reporting screens.

## Stack

- **Frontend**: Angular 22 (zoneless, signals, standalone components, OnPush) — `src/`
- **Backend**: Express 5 + Drizzle ORM (SQLite dev / Neon Postgres prod) — `server/`
- **Tooling**: pnpm 11 (pinned via `packageManager`), Node 22.12+, Vitest

## Getting started

```bash
pnpm install
pnpm db:generate    # generate Drizzle migrations (SQLite)
pnpm db:migrate     # apply migrations
pnpm start          # runs API (:3000) + Angular dev server (:4200) via concurrently
```

Or independently:

```bash
pnpm start:api      # Express + SQLite on http://localhost:3000
pnpm start:ui       # Angular dev server on http://localhost:4200
```

Open `http://localhost:4200/`. The dev server proxies `/api/*` to the backend via [proxy.conf.json](proxy.conf.json).

## Data

- **Local dev**: SQLite at `data/neuranet.db` (git-ignored). Override with `NEURANET_DB_PATH` env var (`:memory:` for ephemeral runs).
- **Production**: Neon Postgres, enabled by setting `POSTGRES_URL`. The app auto-detects the driver.
- **Migrations**: Managed via Drizzle ORM (`server/migrations/sqlite/` and `server/migrations/postgres/`).
- Seed sample data: `node scripts/seed.mjs` (API must be running).
- Documents can be added via the UI (paste text) or by configuring a Reddit source and fetching.

## Testing

```bash
pnpm test           # frontend unit tests (Vitest via ng test)
pnpm test:server    # backend tests (Vitest, in-memory SQLite)
pnpm typecheck:server  # TypeScript strict mode check
```

## Building

```bash
pnpm build          # Angular production build into dist/neuranet/browser
pnpm build:server   # TypeScript compilation for server
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for Vercel + Neon Postgres deployment guide.

## Project layout

```
server/             Express API, Drizzle schema, repositories, routes, tests
  db/               schema.ts, client.ts, drivers (sqlite + postgres)
  repositories/     per-aggregate data access (clusters, nodes, docs, etc.)
  routes/           Express route handlers
  middleware/        validation, error handling, request ID
  lib/              derivation, async handler, logger, SQL helpers
api/                Vercel serverless entry point (api/index.ts)
src/app/            Angular application
  core/         app-wide services (toast, viewport)
  data/         types, ApiService, AppStore (signals)
  shell/        app shell + sidebar layout
  screens/      routed feature screens
  ui/           reusable presentational components, design tokens, icons
scripts/        seed script
data/           SQLite database (git-ignored)
```

