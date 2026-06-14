# ADR 006: Drizzle ORM for Database Access

**Date:** 2026-06-13

**Status:** Accepted

## Context

The backend originally used raw SQL via `better-sqlite3`'s `db.prepare(...).run/get/all()` API with inline `CREATE TABLE IF NOT EXISTS` statements in `db.js`. This approach was simple but created several problems for a planned Vercel + Neon Postgres deployment:

1. **No migration tracking** — Schema changes had to be applied manually via `db.exec(ALTER TABLE ...)` with try/catch guards. There was no way to know which migrations had been applied.
2. **SQLite-only SQL** — `json_group_array`, `UPDATE OR IGNORE`, `datetime('now')`, integer booleans, and `?` positional placeholders are incompatible with Postgres.
3. **No type safety for query results** — Every `.get()` / `.all()` call required manual type assertions.
4. **No query builder** — Dynamic `IN (...)` clauses required manual placeholder construction with `map(() => '?').join(',')`.

## Decision

**Use Drizzle ORM** as the single source of truth for database schema and query building.

Drizzle was chosen over alternatives (Prisma, Kysely) because:

| Criteria | Drizzle | Prisma | Kysely |
|----------|---------|--------|--------|
| Dual-dialect support | ✅ Native (SQLite + Postgres) | ✅ | ✅ |
| Migration management | ✅ drizzle-kit | ✅ Prisma Migrate | ❌ Manual |
| Bundle size (serverless) | ✅ ~20KB | ❌ ~6MB engine | ✅ ~30KB |
| TypeScript-first | ✅ | ✅ | ✅ |
| Raw SQL escape hatch | ✅ `sql`...`` | ✅ `$queryRaw` | ✅ Native |
| Sync + Async drivers | ✅ Both | ❌ Async only | ✅ Both |

Drizzle specifically enables:
- A single `schema.ts` that compiles to both SQLite and Postgres DDL
- `drizzle-kit generate` for automatic migration generation
- Drizzle's query builder for type-safe CRUD
- `sql`...`` tagged templates as a safe escape hatch for dialect-specific SQL
- Small bundle size critical for Vercel serverless cold starts

## Consequences

### Positive
- All schema changes are tracked in version-controlled migration files (`server/migrations/{sqlite,postgres}/`)
- Tests run against `:memory:` SQLite with migrations applied automatically
- Repository pattern (ADR-implicit) isolates dialect differences into per-aggregate classes
- Type-safe queries reduce runtime errors from misspelled column names

### Negative
- better-sqlite3 transactions are synchronous; Drizzle wraps them as sync `db.transaction((tx) => {...})` — cannot use async callbacks. This differs from Postgres transactions which are async.
- API response shapes must be manually mapped from Drizzle's camelCase columns to the existing snake_case API contract
- `UPDATE OR IGNORE` (SQLite-only) requires raw SQL in repos; Postgres equivalent is `ON CONFLICT DO NOTHING` (INSERT-only) or delete-then-insert for UPDATEs
