**Migration Plan: archubbuck/neuranet to Vercel**

_Stack Architecture: TypeScript + Drizzle ORM + Neon Postgres + Upstash Redis_

# **🎯 Goal**

Deploy the full-stack app to Vercel (frontend, API, and database). Transition the codebase to an enterprise-grade, future-proof architecture using a 6-step sequential Pull Request (PR) execution model.

# **🔍 Repository Snapshot**

## **Current Stack & Architecture**

- **Frontend:** Angular 22 (zoneless, signals, standalone components, OnPush) located in src/. Built via @angular/build:application (output: dist/neuranet/browser).
- **Backend:** Express 5 + better-sqlite3 located in server/ (currently CommonJS .js). Entrypoint: server/index.js listening on port :3000.
- **Dev Flow:** Angular dev server on port :4200 proxies /api/\* to :3000 via proxy.conf.json.
- **Data Layer:** Local SQLite file at data/neuranet.db (overridable via NEURANET_DB_PATH, supports :memory:). Schema is currently initialized inline via db.exec(CREATE TABLE IF NOT EXISTS ...) in server/db.js.
- **Tooling & Testing:** Node ≥22.12, pnpm 11 (pinned via packageManager), and Vitest for testing (server/index.test.mjs and server/reddit-fetcher.test.mjs).

## **Active Backend Routes**

All current routes use synchronous better-sqlite3 APIs wrapped in db.transaction(fn)():

- clusters.js
- docs.js
- network.js
- nodes.js
- reports.js
- search.js
- sources.js

# **🛠️ Architectural Problems to Solve**

**1\. Postgres Async Driver vs. Sync SQLite:** Existing routes rely on three better-sqlite3 behaviors missing from Postgres:

- **Synchronous Queries:** db.prepare(...).run/get/all() returns immediately. Postgres drivers are async-only.
- **Synchronous Transactions:** db.transaction(fn)() vs. explicit BEGIN/COMMIT management over a dedicated serverless connection.
- **Row ID Retrieval:** lastInsertRowid vs. explicit Postgres RETURNING id syntax.

**2\. SQL Dialect Drift:** Syntax mismatches and incompatible features across engines:

- INSERT ... ON CONFLICT(col) DO NOTHING/UPDATE SET ... excluded.col syntax variation.
- json_group_array(...) (SQLite-only) vs. json_agg(...) (Postgres).
- UPDATE OR IGNORE (SQLite-only).
- datetime('now') vs. now().
- INTEGER booleans (0/1) vs. native BOOLEAN.
- ? positional placeholders vs. \$1 numbered parameters.
- INTEGER PRIMARY KEY AUTOINCREMENT vs. GENERATED ALWAYS AS IDENTITY.

**3\. Serverless Constraints:** better-sqlite3 requires a writable, persistent filesystem and compiles platform-native addons, making it incompatible with Vercel Functions.

# **🔒 Locked-in Architectural Decisions**

- **Backend TypeScript:** Convert all server/\*\*/\*.js modules to .ts enforced by strict mode.
- **Drizzle ORM & Drizzle-Kit:** Manage single-source-of-truth schema in schema.ts. Abstract dialect translations so the code compiles seamlessly to both SQLite and Postgres.
- **Production Database:** Neon Postgres accessed via Vercel's native integration (POSTGRES_URL). Local development and test environments will maintain better-sqlite3.
- **Database Driver:** @neondatabase/serverless using HTTP/WebSocket connectivity tailored for serverless cold-start efficiency.
- **Driver Selection:** Dynamic runtime selection based on env vars (POSTGRES_URL present ➔ Neon, otherwise ➔ SQLite).
- **Distributed Rate Limiting:** Replace in-memory express-rate-limit with Upstash Redis (@upstash/ratelimit) to maintain state consistency across ephemeral serverless instances.
- **Express Entrypoint:** Bundle Express into a single Vercel function inside api/index.ts to manage routing. Split out individual serverless functions later only if cold-start latency dictates.
- **Repository Pattern:** Wrap Drizzle interactions behind per-aggregate repositories (docsRepo, nodesRepo, etc.) to isolate routes from direct database queries.
- **Preview Environments:** Leverage Neon's branching engine to spin up isolated database instances paired with Vercel preview deployments.
- **Deferred Actions:** Sentry setup and observability tooling are deferred to a post-migration phase.

# **📁 New Project Layout & Specification**

_Configuration / Specification Rule for vercel.json:  
Build: pnpm build && pnpm build:server  
Output Directory: dist/neuranet/browser  
Runtime: nodejs22.x, maxDuration: 30s  
Rewrites: API requests transparently route to api/index, structural matches fallback to SPA index.html._

# **🚀 Sequential PR Execution Strategy**

## **PR 1: Backend TypeScript + Drizzle Schema Setup (SQLite Only)**

**Scope:**

• Convert server/\*\*/\*.js ➔ \*.ts with strict mode enabled. Add server/tsconfig.json.

• Install dependencies: drizzle-orm, drizzle-kit, and tsx.

• Port existing CREATE TABLE rules from server/db.js (including the sentiment column) into server/db/schema.ts.

• Add drizzle.config.ts targeting the SQLite dialect. Generate and commit initial migrations.

• Swap inline db.exec(...) calls for a Drizzle migration run executed on app/test initialization.

• Compatibility Shim: server/db.ts must temporarily continue exporting the raw better-sqlite3 instance so legacy synchronous routes don't break.

• Introduce pipeline scripts: db:generate, db:migrate, typecheck:server, and build:server.

• Update start:api to run via tsx. Clean up lint and format globs.

**Out of Scope:** Route modifications, Postgres setup, vercel.json inclusion, or observability layers.

**Acceptance Criteria:** All test assertions pass unmodified. pnpm start:api, pnpm test:server, pnpm lint, and pnpm build compile perfectly.

## **PR 2: Repository Layer Layering + Route Refactoring**

**Scope:**

• Introduce server/repositories/\*.ts mapped to aggregates. Expose intent-revealing paradigms (docsRepo.create, nodesRepo.merge).

• Convert all route entrypoints to async. Swap out synchronous db.prepare(...).run/get/all execution blocks for repository calls.

• Transition db.transaction(() => {}) logic blocks to asynchronous await db.transaction(async (tx) => {}) syntax blocks.

• Switch lastInsertRowid tracking out for .returning({ id: ... }) queries.

• Implement an asyncHandler(fn) wrapper to pass runtime errors cleanly through to the errorHandler middleware block.

• Refactor Focus Areas: routes/sources.js (heavy derivation loop), routes/nodes.js (UPDATE OR IGNORE, dynamic IN, merge transactions), routes/docs.js (json_group_array structure).

**Out of Scope:** Introducing Postgres drivers or runtime environment branches.

**Acceptance Criteria:** The entire existing test harness executes successfully without altering assertions.

## **PR 3: Postgres Integration + Dual-Dialect Schema Management**

**Scope:**

• Install @neondatabase/serverless and drizzle-orm/neon-http.

• Construct server/db/drivers/postgres.ts.

• Implement runtime isolation logic in server/db/client.ts (POSTGRES_URL checks).

• Configure drizzle.config.ts to output Postgres migrations into server/migrations/postgres/ using multi-dialect configs or condition variables.

• Resolve underlying cross-dialect syntax gaps within the repository layers: map json_group_array ➔ json_agg and switch UPDATE OR IGNORE patterns over to generic delete-then-update blocks or ON CONFLICT DO NOTHING statements.

• CI Configuration: Add a Postgres runner instance to the testing workflow (utilizing an ephemeral Neon branch database or a PostgreSQL service container) running the shared Vitest matrix.

**Acceptance Criteria:** Validation test suites evaluate successfully across both SQLite and Postgres test engines.

## **PR 4: Security Enhancements + Production Observability Middleware**

**Scope:**

• Integrate pino structured JSON logs. Strip out remaining naked console.error logs.

• Write Trace/Request ID extraction middleware (intercepting x-vercel-id headers with fallback creation).

• Expose /api/health/ready to provide real-time database readiness pings alongside basic /api/health checks.

• Swap in-memory rate limiting for Upstash Redis connectivity (@upstash/ratelimit). Inject runtime parsing for UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.

• Add security headers via helmet and configure env-driven cors rule evaluation.

**Acceptance Criteria:** Rate limiting works consistently across serverless lifecycle states. Structured JSON logs stream correctly, and all baseline test workflows pass.

## **PR 5: Vercel Compilation Configuration + Technical Documentation**

**Scope:**

• Commit vercel.json deployment rules.

• Create the serverless function handler api/index.ts to cleanly bridge inside the existing Express application footprint.

• Configure a vercel-build build hook to apply migrations via pnpm db:migrate directly against production target scopes (or document an approved manual pnpm db:deploy migration flow).

• Document the strict build engine parameters: corepack enable && pnpm install --frozen-lockfile.

• Author a new deployment guidebook (docs/deployment.md) mapping out environment matrices, Neon connection walkthroughs, execution playbooks, rollback runs, and local-versus-cloud edge behaviors.

• Publish Architecture Decision Records: docs/adr/0001-drizzle-orm.md and docs/adr/0002-vercel-neon.md.

• Refresh README.md with explicit configuration setups and localized Drizzle lifecycle control scripting commands.

**Acceptance Criteria:** Code branches stage and build cleanly on Vercel infrastructure. UI components resolve, API routes behave nominally, and databases execute safely on Neon.

## **PR 6: CI/CD Pipeline Hardening & Ephemeral Neon Branching**

**Scope:**

• Configure GitHub Actions workflows to execute backend suites concurrently against localized in-memory SQLite instances and integrated Postgres environments.

• Automate deployment hooks: ensure PR creation spawns isolated Vercel preview channels running dynamic, detached Neon database environments via Vercel's first-party Neon integration.

• Introduce automated drizzle-kit check steps to intercept schema drift or migration gaps early.

• Establish dedicated type-safety workflows running tsc -p server/tsconfig.json --noEmit.

• Enforce security audits via pnpm audit --audit-level high.

**Acceptance Criteria:** Merging code changes promotes to production natively, while incoming development PRs trigger clean preview environments equipped with separate DB isolation paths.

# **📐 Team Engineering Conventions**

- **Scope Isolation:** Each migration branch must be complete and reviewable on its own merits. Avoid scope bleed.
- **Frontend Constraints:** Do not touch the client codebase unless explicitly instructed. Frontend platform adjustments should remain isolated to the Vercel routing configurations handled in PR 5.
- **Preserve Test Contracts:** Keep active test suite assertions unmodified during PRs 1 through 3 to guarantee functional parity.
- **Package Management:** Rely on pnpm. Do not introduce npm or yarn artifacts.
- **Workspace Security:** Honor pnpm-workspace.yaml allowBuilds rules. Do not execute untrusted postinstall routines.
- **Formatting Rules:** Code styling must align exactly with local formatting profiles defined in .prettierrc and eslint.config.js.
- **Documentation Standards:** Include formal file-level JSDoc headers at the top of every new or refactored module to match existing patterns.