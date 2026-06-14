# ADR 007: Vercel + Neon Postgres Deployment

**Date:** 2026-06-13

**Status:** Accepted

## Context

The application needed a production deployment target that supports:
- Static hosting for an Angular SPA
- Serverless API endpoints for the Express backend
- A serverless-compatible Postgres database (SQLite filesystem unavailable in serverless)
- Distributed rate limiting across ephemeral instances
- Preview environments for PR review

## Decision

**Deploy to Vercel** with **Neon Postgres** for the database and **Upstash Redis** for rate limiting.

### Platform Selection

| Criteria | Vercel + Neon | Railway | Fly.io | AWS (ECS + RDS) |
|----------|--------------|---------|--------|-----------------|
| Angular SPA hosting | ✅ Native | ✅ | ❌ | ✅ (S3 + CloudFront) |
| Serverless functions | ✅ Native | ❌ (containers) | ❌ (VMs) | ✅ (Lambda) |
| Postgres (serverless) | ✅ Neon integration | ✅ Built-in | ✅ Built-in | ✅ RDS (not serverless) |
| Preview environments | ✅ Per-PR | ✅ | ❌ | ❌ |
| Cold start | ~200ms (Node 22) | N/A (always-on) | N/A (always-on) | ~500ms (Lambda) |
| Free tier | ✅ Generous | ❌ | ❌ | ❌ |
| Edge middleware | ✅ | ❌ | ❌ | ✅ (CloudFront) |

### Architecture

```
                     Vercel Edge Network
                    ┌───────────────────┐
                    │  SPA fallback: /*  │
                    │  → index.html      │
                    │                    │
                    │  API: /api/*       │
                    │  → api/index.ts    │
                    └───────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Neon Postgres   Upstash Redis   (future: Sentry)
        (serverless)    (rate limits)   (observability)
```

### Key Design Decisions

1. **Single Express function** (`api/index.ts`) rather than per-route serverless functions. Cold start is acceptable (~200ms) and this avoids the complexity of splitting route state across multiple functions.

2. **Dynamic driver selection** in `server/db/client.ts`: `POSTGRES_URL` → Neon, otherwise → better-sqlite3. This preserves local development with zero-config SQLite.

3. **Upstash Redis** for rate limiting because in-memory `express-rate-limit` state is lost between serverless invocations. Upstash provides a persistent sliding window with automatic cleanup.

4. **vercel-build hook** runs `pnpm db:migrate` during deployment to apply any pending Drizzle migrations against the production database.

## Consequences

### Positive
- Zero infrastructure management — no servers, containers, or connection pools to configure
- Per-PR preview environments with isolated Neon database branches
- Automatic HTTPS, CDN, and DDoS protection via Vercel's edge network
- Cold starts are fast enough (~200ms) for the app's usage patterns
- Free tier covers development and low-traffic production

### Negative
- **No filesystem access** — SQLite cannot run on Vercel. Local development uses SQLite; production MUST use Postgres.
- **Connection pooling** — Neon's serverless driver handles this, but `better-sqlite3`'s synchronous API is unavailable. Repos must use Drizzle's query builder or raw SQL via `sql`...``.
- **30-second timeout** on serverless functions — long-running Reddit fetches could time out. Mitigation: the fetch route runs derivation in a database transaction; partial results are rolled back on timeout.
- **Vendor lock-in** — Migrating away from Vercel/Neon would require adapting the entry point and driver layers, but the Express app and Drizzle repos remain portable.
- **Cold starts on infrequent routes** — Routes not hit recently may experience ~200ms latency on first request. Acceptable for this app's traffic profile.
