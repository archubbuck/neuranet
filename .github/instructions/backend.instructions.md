---
applyTo: 'server/**'
---

# Backend rules (Express 5 + better-sqlite3)

## Layering
- `index.js` is app assembly only (middleware order: json body → global rate
  limiter → routers → central error handler). Never add route handlers there.
- One router per domain in `routes/` (sources, network, search, reports,
  clusters, nodes, docs). Shared infra: `db.js` (connection + schema),
  `config.js` (ALL env reads), `middleware/`, pure helpers in `lib/`.
- Keep `module.exports = { app, db }` and the `require.main === module`
  listen guard so the test suite can import the app.

## Validation & errors
- Every POST/PUT body gets a zod schema in `schemas.js`, applied with
  `validateBody`. Parsed values replace `req.body`; handlers assume
  well-formed input. No manual `typeof` checks.
- Never return `err.message` or stack details to clients. Log internally
  (`console.error` with route context), respond with a generic message.
- 400 invalid input, 404 missing entity, 409 conflict, 429 rate limit,
  500 generic.

## Data integrity
- Any handler performing more than one write wraps them in
  `db.transaction(() => { ... })()`.
- Always parameterised statements; identifier interpolation only for
  `?`-placeholder lists built from validated arrays.
- Edge reassignment must respect `UNIQUE(source_slug, target_slug)` —
  see the merge handler in `routes/nodes.js` for the delete-then-
  `UPDATE OR IGNORE`-then-sweep pattern.

## Security
- External fetches only to allowlisted hosts (see `reddit-fetcher.js`:
  exact-match + subdomain check, never `endsWith`).
- Expensive/external routes get a strict `express-rate-limit` limiter;
  limits are env-tunable through `config.js`.

## Testing
- `.test.mjs` + Vitest (`server/vitest.config.mjs`). Set
  `process.env.TOPIC_VIZ_DB_PATH = ':memory:'` BEFORE requiring the app.
  Truncate all tables in `beforeEach`. Test via real HTTP against
  `app.listen(0)` (no supertest). Atomicity tests inject failures with
  `RAISE(ABORT)` triggers.
