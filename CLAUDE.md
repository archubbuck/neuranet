# Topic Visualizer (Neuranet)

Angular 22 + Express 5 topic visualization app. Extracts clusters and
relationships from documents (Reddit, web) and renders an interactive
network graph.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 22 (zoneless, signals, standalone, OnPush everywhere) |
| Styling | TailwindCSS v4 (`src/tailwind.css`) + `ui/tokens.ts` for dynamic TS colors |
| Backend | Express 5 + Drizzle ORM + Postgres |
| Auth | Better Auth / Neon Auth (`server/auth.ts`, `server/middleware/auth.ts`) |
| Validation | Zod (`server/schemas.ts` — every POST/PUT) |
| Frontend tests | Vitest + TestBed + HttpTestingController |
| Backend tests | Vitest (`server/vitest.config.mjs`, `pool:forks`) |
| Package manager | pnpm 11 |

## Key Commands

```bash
pnpm test              # Frontend tests (Vitest via @angular/build)
pnpm test:server       # Backend tests
pnpm lint              # ESLint (frontend + server + scripts)
pnpm start             # Full dev (Angular + proxy to API)
pnpm start:api         # API server only
pnpm build             # Production build
pnpm db:migrate        # Run Drizzle migrations
pnpm db:seed           # Seed demo data
```

## Layer Boundaries (lint-enforced)

```
src/app/ui/**   → must NOT import from data/, screens/, shell/
src/app/data/** → must NOT import from screens/, ui/, shell/
```

Dependencies flow: `ui/` ← `screens/` ← `data/` ← `server/routes/` ← `server/repositories/`.

## Key Conventions

- **Components:** standalone, `ChangeDetectionStrategy.OnPush`, signal APIs
  (`input()`, `output()`, `signal`, `computed`). No `@Input`/`@Output`.
- **Styling:** TailwindCSS utility classes in templates. TypeScript-only
  dynamic colors from `ui/tokens.ts`. No hardcoded hex values.
- **Backend:** Zod schema for every POST/PUT body. Multi-write handlers wrap
  in `db.transaction()`. Routes call repo methods — never import Drizzle directly.
- **Security:** All env reads through `env.ts`/`config.ts`. External fetches
  use SSRF-safe host allowlist (`reddit-fetcher.ts`). Auth via `requireAuth` middleware.
- **Testing:** `TestBed.tick()` flushes signal effects in zoneless mode.
  Backend tests use `app.listen(0)` + native `fetch()` (no supertest).
  Tables truncated in FK-safe order in `beforeEach`.
- **Routing:** Lazy `loadComponent` + `title`. Landing page renders outside
  `AppShellComponent`; app features nest under the shell layout route.

## File Map

```
server/
  routes/          ← one router per domain (sources, network, search, …)
  repositories/    ← Drizzle queries encapsulated (*.repo.ts)
  middleware/      ← auth, error, validate, request-id
  db/              ← Drizzle client + schema
  schemas.ts       ← all zod validation schemas
src/app/
  data/            ← types, ApiService, AppStore (signals-based global state)
  screens/         ← routed feature components, one folder per feature
  ui/              ← presentational primitives (no data imports)
    primitives/    ← button, tabs, search-input, checkbox, status-badge
    overlays/      ← modal, popover, toast
    charts/        ← donut, hbar-list, sent-bars, stat-card
    tokens.ts      ← design tokens (C, CLUSTER_COLORS, FONT, BREAKPOINTS, …)
    icons.ts       ← Lucide-style SVG path map
  shell/           ← AppShellComponent (layout, sidebar, header)
  core/            ← auth guard, toast, viewport, format utilities
```

## Always / Never

| Rule | Scope |
|------|-------|
| Always | Run tests before commits. Validate user input with zod. |
| Ask first | DB schema changes. New dependencies. |
| Never | Commit secrets. Remove failing tests. Skip verification. |

## PR Gates (CI-enforced)

`lint → typecheck → tests → build`

## Token Optimization Constraints

- NEVER read a file completely if it exceeds 150 lines. Use targeted tools
  to read specific line ranges.
- Do not add conversational fluff or repeat back code that already exists
  in the editor diff.