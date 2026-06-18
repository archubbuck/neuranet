# Database Isolation Strategy

> **Goal:** Every context — local dev, CI, preview deployments, and production — gets an
> isolated database. Zero cross-contamination, zero manual setup per task.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Neon Project                                   │
│                                                                          │
│  main ─────── production (protected, point-in-time recovery enabled)    │
│                                                                          │
│  dev ──────── integration preview (Vercel auto-branch from main)        │
│                                                                          │
│  feat/xxx ─── PR preview (auto-created on PR open, API-deleted on close)│
│                                                                          │
│  <name> ──── per-developer branch (auto-created via pnpm dev:bootstrap) │
└─────────────────────────────────────────────────────────────────────────┘

CI ─────────── Postgres 16 service container (ephemeral per run)
Local tests ── Local Postgres 16 (docker compose, same image as CI)
```

---

## Isolation per context

| Context | Database | Isolation mechanism |
|---------|----------|-------------------|
| **Production** (`master`) | Neon: `main` | Protected branch; only `dev` → `master` merges touch it |
| **Dev preview** (`dev` branch) | Neon: `dev` | One branch, stable integration environment |
| **PR preview** (feature branches) | Neon: `feat/xxx` | Auto-created by Vercel on PR open, deleted via API on PR close |
| **CI** (every push) | Postgres 16 container | Ephemeral — fresh container per run, destroyed after |
| **Local dev** (your machine) | Local Postgres 16 (docker) or Neon: `<your-name>` | Personal — no one else writes to it |

No two contexts share a database. Ever.

### Driver parity

Local dev and CI use the **same** `pg` (node-postgres) driver against Postgres 16.
This eliminates the Neon HTTP driver's `db.transaction()` limitation from the
development feedback loop. Production and preview deployments use Neon HTTP
(via `DB_DRIVER=neon-http` or auto-detection from the Neon URL), which is the
only place that driver is exercised — and transaction-dependent code paths are
verified in CI against real Postgres.

| Context | Driver | `db.transaction()` |
|---------|--------|-------------------|
| Production / Preview | Neon HTTP | ❌ Not supported |
| CI | `pg` (node-postgres) | ✅ Full support |
| Local dev | `pg` (node-postgres) | ✅ Full support |

---

## Workflow

### Day to day

```mermaid
gitGraph
    commit id: "initial"
    branch dev
    checkout dev
    branch feat/my-thing
    commit id: "work locally"
    commit id: "push & open PR"
    checkout dev
    merge feat/my-thing tag: "merge PR"
    checkout master
    merge dev tag: "release"
```

| Step | What happens to the database |
|------|------------------------------|
| `git checkout -b feat/my-thing` | Local dev uses local Postgres (docker) — no one else affected |
| `git push` | CI spins up a fresh Postgres container, runs tests, destroys it |
| Open PR `feat/my-thing` → `dev` | Vercel creates Neon branch `feat/my-thing` for preview |
| Merge PR → close PR | GitHub Action deletes Neon branch via API |
| `dev` → `master` release | Only this merge writes to `main` (production) |

### What a developer does on day 1

```sh
# 1. Clone
git clone <repo>
cd topic-visualizer

# 2. Install dependencies
pnpm install

# 3. Start local Postgres
docker compose up -d

# 4. Apply migrations + seed demo data
pnpm db:migrate
pnpm db:seed

# 5. Verify
pnpm test:server    # runs against local Postgres (same driver as CI)
pnpm test           # frontend tests (no DB needed)

# 6. Start the app
pnpm start
```

### Optional: Use a personal Neon branch

If you prefer a remote database for local dev (e.g., to share state across
machines), create a personal Neon branch:

```sh
# Set Neon credentials (once per machine).
$env:NEON_API_KEY="napi_..."
$env:NEON_PROJECT_ID="project-id"

# Auto-create branch + write .env.local + seed demo data.
pnpm dev:bootstrap --seed

# Verify.
pnpm test:server
```

---

## CI details

CI does **not** use Neon. Each job spins up a disposable Postgres 16 container:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: neuranet_test
```

This avoids the Neon HTTP driver's transaction limitation
(`db.transaction()` throws `"No transactions support in neon-http driver"`) and keeps CI
fast — no branch create/delete API calls, no network latency to a remote database.

The Vitest config provides a default `POSTGRES_URL` for test workers:

```ts
// server/vitest.config.mjs
env: {
  POSTGRES_URL:
    process.env['POSTGRES_URL'] ||
    'postgres://postgres:postgres@localhost:5432/neuranet_dev',
},
```

The CI workflow overrides this with its own service container URL. For local dev,
`docker compose up -d` provides a matching Postgres 16 instance.

---

## Running backend tests

### Local Postgres (recommended)

```powershell
docker compose up -d                 # start Postgres 16
pnpm test:server                     # uses vitest env default
```

### Neon branch (optional)

```powershell
pnpm dev:bootstrap                   # creates branch + writes .env.local
pnpm test:server                     # picks up POSTGRES_URL from .env.local
```

### Running a subset of tests

```powershell
pnpm vitest run --config server/vitest.config.mjs server/index.test.ts -t "auth"
pnpm vitest run --config server/vitest.config.mjs server/index.test.ts -t "health|validation"
```

---

## Vercel + Neon auto-branching for previews

Enable in the Vercel dashboard:

1. Go to your project on Vercel → **Storage** → **Neon**
2. Enable **"Create database branch for preview deployments"**
3. Set the parent branch to `main` (or whatever production branch is)

Once enabled, every PR gets:
- A unique preview URL (`pr-42.vercel.app`)
- A unique Neon database branch (`feat/my-thing`)
- Branch deletion via GitHub Action when the PR closes (see `preview-teardown.yml`)

### Programmatic teardown

The `preview-teardown.yml` workflow uses the Neon API to delete preview branches
when PRs close. It requires two GitHub Actions secrets:

| Secret | Source |
|--------|--------|
| `NEON_API_KEY` | Neon Console → Project Settings → API Keys |
| `NEON_PROJECT_ID` | Neon Console → Project Settings → General (Project ID) |

Without these secrets, the workflow skips deletion gracefully and logs a warning.

---

## Environment variables summary

| Variable | Where set | Used by |
|----------|-----------|---------|
| `POSTGRES_URL` | `docker compose` default or `.env.local` | Local dev + tests |
| `POSTGRES_URL` | GitHub Actions workflow env | CI `test-server` / `migration-gate` jobs |
| `POSTGRES_URL` | Injected by Neon integration | Production deployment |
| `POSTGRES_URL` | Injected by Vercel per preview | PR preview deployments |
| `DB_DRIVER` | `.env.local` (optional) | Explicit driver selection (`neon-http` \| `pg`), defaults to `pg` |
| `NEON_API_KEY` | Developer workstation / GitHub Secrets | `dev:bootstrap` + `preview-teardown` |
| `NEON_PROJECT_ID` | Developer workstation / GitHub Secrets | `dev:bootstrap` + `preview-teardown` |
| `NEON_AUTH_BASE_URL` | Vercel env (Neon integration) | Production + preview deployments |

### How `DB_DRIVER` and `POSTGRES_URL` are resolved

All env resolution is centralised in `server/env.ts`. No module reads
`process.env.POSTGRES_URL` or calls `process.loadEnvFile` directly.

1. `env.ts` loads `.env.local` once at module scope.
2. `getDbDriver()` checks `DB_DRIVER` first, then falls back to auto-detection
   from the `POSTGRES_URL` (contains `neon.tech` → `neon-http`, else `pg`).
3. `getPostgresUrl()` throws a clear error if neither env var is set.

---

## Database cleanup policy

| Branch type | Cleanup trigger | Mechanism |
|-------------|----------------|-----------|
| PR preview (`feat/xxx`) | PR closed | `preview-teardown.yml` via Neon API |
| Personal dev (`<name>`) | Manual or after 30 days of inactivity | Developer deletes via Neon Console or API |
| Integration (`dev`) | Manual only | Persistent — used by multiple PRs |
| Production (`main`) | Never | **Protected** in Neon settings |

To prevent accidental deletion, mark the `main` branch as **protected** in the
Neon Console (Project → Branches → main → Settings → Protect branch).

---

## Why this approach

| Requirement | How it's met |
|-------------|-------------|
| **Zero cross-contamination** | Every context has its own database — never shared |
| **Zero manual setup** | `docker compose up -d` + `pnpm db:seed` — no Neon Console clicks |
| **No PR required to start work** | Branch locally, develop against local Postgres |
| **CI is fast and reliable** | Local Postgres container — no network dependency, full transaction support |
| **PR previews are isolated** | Auto-created Neon branch per PR, programmatically deleted on close |
| **Production is protected** | Protected Neon branch; only `dev` → `master` merges reach `main` |
| **Scales to multiple developers** | Each dev has their own docker Postgres or Neon branch — no coordination needed |
| **Driver parity** | Local dev and CI use identical `pg` driver — no "works in CI, fails locally" |
| **Clean error messages** | `env.ts` throws descriptive errors — no silent fallbacks |

---

## Bootstrap and seed scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev:bootstrap` | Auto-create a personal Neon branch (or fall back to local PG) and write `.env.local` |
| `pnpm dev:bootstrap --seed` | Same as above + populate demo data |
| `pnpm db:seed` | Populate the current database with 8 clusters, 18 nodes, 13 edges, and 3 docs |
| `pnpm db:migrate` | Apply pending Drizzle migrations to the current database |
| `pnpm db:generate` | Generate new migration files from schema changes |

`dev:bootstrap` uses the Neon API with `NEON_API_KEY` and `NEON_PROJECT_ID`.
If those aren't set, it writes a local Postgres URL instead, so the developer
just needs `docker compose up -d`.

