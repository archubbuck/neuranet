---
applyTo: 'server/**'
---

# Backend rules (Express 5 + Drizzle ORM + Postgres)

## Layering
- `index.ts` is app assembly only (middleware order: helmet → cors → request
  id → json body → global rate limiter → routers → central error handler).
  Never add route handlers there.
- One router per domain in `routes/` (sources, network, search, reports,
  clusters, nodes, docs, auth, waitlist). Shared infra: `db/client.ts`
  (Drizzle connection), `db/schema.ts` (Drizzle pgTable definitions),
  `config.ts` (ALL env reads via `env.ts`), `middleware/`, repository
  classes in `repositories/`, pure helpers in `lib/`.
- Keep `export const app` and guard `app.listen(0)` behind
  `import.meta.url === ...` so the test suite can import the app without
  binding the listener twice.

## Validation & errors
- Every POST/PUT body gets a zod schema in `schemas.ts`, applied with
  `validateBody` middleware. Parsed values replace `req.body`; handlers
  assume well-formed input. No manual `typeof` checks.
- Never return `err.message` or stack details to clients. Log internally
  with the pino logger (`logger.error` with route context), respond with
  a generic message via the central `errorHandler` in `middleware/error.ts`.
- 400 invalid input, 404 missing entity, 409 conflict, 429 rate limit,
  500 generic.

## Data integrity
- Any handler performing more than one write wraps them in
  `db.transaction(async (tx) => { ... })`.
- Build queries through the Drizzle ORM API (`.select()`, `.insert()`,
  `.update()`, `.delete()`). Use `sql` template tag only for fragments
  that Drizzle doesn't expose directly.
- Edge reassignment must respect the `UNIQUE(source_slug, target_slug)`
  constraint on `node_links` — see `network.repo.ts` for the delete-then-
  reinsert pattern inside a transaction.
- Repositories (`repositories/*.repo.ts`) encapsulate all Drizzle queries.
  Routes call repo methods; they never import Drizzle directly.

## Security
- External fetches only to allowlisted hosts (see `reddit-fetcher.ts`:
  exact-match + subdomain check, never `endsWith`).
- Expensive/external routes get rate limiting via Upstash Redis when
  configured (serverless-safe), falling back to `express-rate-limit` for
  local dev. Limits are env-tunable through `config.ts`.
- Authenticated endpoints use the `requireAuth` / `optionalAuth` middleware
  from `middleware/auth.ts`, which verifies the session cookie via
  Better Auth / Neon Auth. Private data endpoints must use `requireAuth`.
- Rate limiter and auth middleware are applied per-router, not globally
  (see `index.ts` for the pattern).

## Testing
- `.test.ts` + Vitest (`server/vitest.config.mjs`) with `pool: 'forks'`
  and `isolate: true` so each file gets its own Postgres connection.
  POSTGRES_URL must be set (docker-compose for local dev, service container
  in CI, or a Neon branch connection string).
- Truncate all tables in `beforeEach` using `drizzle.delete()`. Test via
  real HTTP against `app.listen(0)` (no supertest). Use `vi.mock()` for
  external fetchers (`reddit-fetcher.ts`).
- Async route handlers must be wrapped with `asyncHandler` from
  `lib/async-handler.ts` — never catch manually and forward with `next()`.
