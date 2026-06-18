# Neuranet

Interactive topic-network visualizer. An Express + Drizzle ORM backend (Postgres) ingests documents (manual upload or Reddit fetch), derives topic clusters/nodes/edges from keywords, and an Angular frontend renders the network with management, search, and reporting screens.

## Stack

- **Frontend**: Angular 22 (zoneless, signals, standalone components, OnPush) — `src/`
- **Backend**: Express 5 + Drizzle ORM (Postgres 16 local dev / Neon Postgres prod) — `server/`
- **Tooling**: pnpm 11 (pinned via `packageManager`), Node 22.12+, Vitest, Docker

## Getting started

**New to the project?** Follow the full **[Developer Onboarding Guide](docs/developer-onboarding.md)** — it covers every step from installing software to making your first PR.

Quick start (if you already have the prerequisites):

```bash
pnpm install
docker compose up -d   # start Postgres 16
pnpm db:migrate        # apply migrations
pnpm db:seed           # populate demo data
pnpm start             # runs API (:3000) + Angular dev server (:4200)
```

Open `http://localhost:4200/`. The dev server proxies `/api/*` to the backend via [proxy.conf.json](proxy.conf.json).

## Data

- **Local dev**: Postgres 16 via Docker (`docker compose up -d`). Database: `neuranet_dev`.
- **Production**: Neon Postgres, enabled by setting `POSTGRES_URL`.
- **Migrations**: Managed via Drizzle ORM (`server/migrations/postgres/`).
- See `docs/database-isolation-strategy.md` for the full isolation strategy.

## Testing

```bash
pnpm test           # frontend unit tests (Vitest via ng test)
pnpm test:server    # backend integration tests (requires Docker Postgres)
pnpm typecheck:server  # TypeScript strict mode check
```

## Building

```bash
pnpm build          # Angular production build into dist/neuranet/browser
pnpm build:server   # TypeScript compilation for server
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for Vercel + Neon Postgres deployment guide.

## Documentation

| Document | Purpose |
|----------|---------|
| [Developer Onboarding](docs/developer-onboarding.md) | Complete setup guide for new developers |
| [Database Isolation Strategy](docs/database-isolation-strategy.md) | How databases are isolated across environments |
| [Deployment Guide](docs/deployment.md) | Vercel + Neon Postgres deployment |
| [Architecture Decisions](docs/adr/) | Record of architectural decisions |

## Project layout

```
server/             Express API, Drizzle schema, repositories, routes, tests
  db/               schema.ts, client.ts, drivers (postgres)
  repositories/     per-aggregate data access (clusters, nodes, docs, etc.)
  routes/           Express route handlers
  middleware/        auth, validation, error handling, request ID
  lib/              derivation, async handler, logger, SQL helpers
api/                Vercel serverless entry point (api/index.ts)
src/app/            Angular application
  core/         app-wide services (toast, viewport, auth)
  data/         types, ApiService, AppStore (signals), AuthStore
  shell/        app shell + sidebar layout
  screens/      routed feature screens
  ui/           reusable presentational components, design tokens, icons
scripts/        seed, bootstrap, and utility scripts
```
```

