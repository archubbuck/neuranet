# Neuranet Deployment Guide

## Architecture Overview

Neuranet is a full-stack application deployed on **Vercel** with a **Neon Postgres** database. The frontend (Angular 22) is served as static assets; the backend (Express 5 + Drizzle ORM) runs as a single Vercel serverless function at `api/index.ts`.

```
┌─────────────────────────────────────────────────┐
│                    Vercel                        │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │  Static Site  │    │  Serverless Function │   │
│  │  (Angular)    │◄───│  api/index.ts        │   │
│  │  dist/neuranet│    │  (Express + Drizzle) │   │
│  └──────────────┘    └──────────┬───────────┘   │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                          ┌────────▼───────────┐
                          │   Neon Postgres     │
                          │   (Serverless PG)   │
                          └────────────────────┘
                          ┌────────▼───────────┐
                          │   Upstash Redis     │
                          │   (Rate Limiting)   │
                          └────────────────────┘
```

## Environment Variables

### Required for Production

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Neon Postgres connection string (auto-set by Vercel Neon integration) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis authentication token |
| `CORS_ORIGIN` | Allowed CORS origin (your Vercel deployment URL) |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Set to `production` in Vercel |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | pino log level |
| `API_PORT` | `3000` | Port for local dev (ignored on Vercel) |
| `NEURANET_DB_PATH` | `data/neuranet.db` | SQLite path for local dev |
| `NEURANET_GLOBAL_RATE_MAX` | `1000` | Requests per minute (in-memory fallback) |
| `NEURANET_FETCH_RATE_MAX` | `5` | Reddit fetch requests per minute |

## Local Development

```bash
# Install dependencies
pnpm install

# Generate and apply migrations (SQLite)
pnpm db:generate
pnpm db:migrate

# Start both API and UI
pnpm start
# API: http://localhost:3000
# UI:  http://localhost:4200 (proxies /api to :3000)

# Run tests
pnpm test             # Frontend (Angular)
pnpm test:server      # Backend (Vitest + SQLite :memory:)

# Type check
pnpm typecheck:server
```

### Local Postgres (optional)

```bash
# Start a local Postgres instance (Docker)
docker run -d --name neuranet-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Set the connection string
export POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres

# Generate Postgres migrations
pnpm db:generate:pg

# Start the API (will use Postgres instead of SQLite)
pnpm start:api
```

## Production Deployment

### 1. Neon Database Setup

1. Create a [Neon](https://neon.tech) account and project
2. Copy the connection string from the Neon dashboard
3. In Vercel project settings, add the Neon integration (auto-sets `POSTGRES_URL`)
4. Alternatively, manually set `POSTGRES_URL` in Vercel environment variables

### 2. Upstash Redis Setup

1. Create an [Upstash](https://upstash.com) account and Redis database
2. Copy the REST URL and token from the Upstash dashboard
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel

### 3. Vercel Project Setup

1. Import the repository into Vercel
2. Configure build settings:
   - **Framework Preset:** Other
   - **Build Command:** `pnpm vercel-build` (runs migrations + Angular build + TypeScript compile)
   - **Output Directory:** `dist/neuranet/browser`
   - **Install Command:** `corepack enable && pnpm install --frozen-lockfile`
3. Add all required environment variables
4. Deploy

### 4. Apply Migrations

Migrations run automatically during `vercel-build`. To run them manually:

```bash
# Against production (set POSTGRES_URL first)
pnpm db:migrate
```

## Preview Environments

When using Vercel's GitHub integration, every pull request automatically creates a preview deployment. Combined with Neon's branching feature:

1. Each PR gets an isolated Vercel preview URL
2. Neon creates a temporary database branch for the preview
3. Migrations run against the preview branch during build
4. The branch is automatically cleaned up when the PR is closed

## Rollback Procedure

1. **Revert code:** `git revert <commit>` or deploy a previous commit via Vercel dashboard
2. **Rollback database:** If the deployment included a migration that needs reverting:
   ```bash
   # Connect to Neon and run the inverse migration SQL
   psql $POSTGRES_URL -f server/migrations/postgres/rollback_xxx.sql
   ```
3. **Verify:** Check `/api/health/ready` returns `{ status: 'ready' }`

## Monitoring

- **Health check:** `GET /api/health` — basic liveness
- **Readiness check:** `GET /api/health/ready` — database connectivity
- **Logs:** Structured JSON logs via pino. View in Vercel's Logs dashboard or ship to your log aggregator
- **Rate limiting:** Upstash Redis sliding window. Monitor via Upstash dashboard

## Drizzle Migrations

```bash
# Generate migrations from schema changes (both dialects)
pnpm db:generate          # SQLite
pnpm db:generate:pg       # Postgres

# Apply migrations
pnpm db:migrate           # Applies to configured database (SQLite or Postgres)
```

The migration directories are:
- `server/migrations/sqlite/` — SQLite migrations
- `server/migrations/postgres/` — Postgres migrations
