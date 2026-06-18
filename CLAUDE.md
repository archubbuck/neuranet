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

## Conventions (canonical sources)

Read these before adding or modifying code — they define project-specific
patterns that override generic framework defaults:

| Topic | Source |
|-------|--------|
| Component recipe, styling, routing, testing | `.github/instructions/frontend.instructions.md` |
| Backend layering, validation, data integrity, security | `.github/instructions/backend.instructions.md` |
| UI primitive rules (presentational, token-styled) | `.github/instructions/ui-primitives.instructions.md` |
| Layer boundaries, PR gates, always/never | `.github/copilot-instructions.md` |
| Five-axis review, TDD, increments | `.github/principles.md` |
| Skill discovery (lazy-load, never preload all) | `.github/SKILLS_INDEX.md` |

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

## Token Optimization Constraints

- NEVER read a file completely if it exceeds 150 lines. Use targeted tools
  to read specific line ranges.
- Do not add conversational fluff or repeat back code that already exists
  in the editor diff.