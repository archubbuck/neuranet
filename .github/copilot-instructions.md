# Project Coding Standards

## Testing
- Write tests before code (TDD)
- For bugs: write a failing test first, then fix (Prove-It pattern)
- Test hierarchy: unit > integration > e2e (use the lowest level that captures the behavior)
- Run `pnpm test` (frontend) and `pnpm test:server` (backend) after every change

## Code Quality
- Review across five axes: correctness, readability, architecture, security, performance
- Every PR must pass: lint, type check, tests, build (enforced by `.github/workflows/ci.yml`)
- No secrets in code or version control

## Implementation
- Build in small, verifiable increments
- Each increment: implement → test → verify → commit
- Never mix formatting changes with behavior changes

## Boundaries
- Always: Run tests before commits, validate user input
- Ask first: Database schema changes, new dependencies
- Never: Commit secrets, remove failing tests, skip verification

## Architecture (the law of this repo)

Decisions are recorded in `docs/adr/`; read the relevant ADR before changing
an area, and add a new ADR when making an architectural decision.

### Frontend layers (lint-enforced — see `eslint.config.js`)
- `src/app/ui/` — dumb presentational components only. Inputs/outputs, token
  styling (`ui/tokens.ts` / CSS custom properties). MUST NOT import from
  `data/`, `screens/`, or `shell/`. Extend `ui/` before writing new inline UI:
  primitives (button, checkbox, icon, tabs, search-input, page-header,
  status-badge), overlays (modal, popover, toast), charts (donut, hbar-list,
  sent-bars, stat-card).
- `src/app/data/` — types, `ApiService` (only place HTTP happens), `AppStore`
  (signals). MUST NOT import from `screens/`, `ui/`, or `shell/`.
- `src/app/screens/<feature>/` — one folder per routed feature. Screens hold
  state and orchestration; extracted children are dumb (inputs/outputs only).
- `src/app/core/` — app-wide services and helpers (toast, viewport, format).
- `src/app/shell/` — app chrome (sidebar, mobile nav); bootstraps
  `AppStore.loadAll()` when instantiated.

### Frontend conventions
- Standalone components, `ChangeDetectionStrategy.OnPush`, signals only
  (`signal`/`computed`/`input()`/`output()`/`model()`); zoneless app.
- No method calls in templates that run per change-detection cycle — derive
  view-models with `computed()` (see `network-graph.component.ts` nodeVms).
- `effect()` timers/listeners must use `onCleanup`; `requestAnimationFrame`
  loops must be cancelled via `DestroyRef`.
- Routing: lazy `loadComponent` for every route, `title` on every route,
  navigation via `Router` (never store-based screen switching). Landing (`/`)
  renders outside `AppShellComponent`; app routes nest under it.
- Don't name outputs after native DOM events (`closed` not `close`,
  `toggled` not `toggle`).
- No hardcoded hex colors in new components — use tokens/CSS vars.
- Every new component ships with a spec (`spec-helpers.ts` provides
  `seedAppStore`; use `TestBed.tick()` for effects, `DeferBlockState` for
  `@defer` content).

### Backend layers (`server/`)
- `index.js` is assembly only. Routes live in `routes/<domain>.js`, shared
  infra in `db.js` / `config.js` / `middleware/`, pure helpers in `lib/`.
- Every POST/PUT body gets a zod schema in `schemas.js` applied via
  `validateBody` middleware. Never hand-roll `typeof` checks.
- Multi-step writes MUST be wrapped in `db.transaction()`.
- Never send `err.message` to clients — log server-side, return generic
  messages (central handler in `middleware/error.js`).
- All env access goes through `config.js`.
- Tests: `.test.mjs` with `TOPIC_VIZ_DB_PATH=':memory:'` set before requiring
  the app; truncate tables in `beforeEach`.

### Checklists
New screen: feature folder under `screens/`, lazy route + title in
`app.routes.ts`, compose from `ui/` primitives, spec file, state via
`AppStore` (no direct `ApiService` injection in components).

New endpoint: zod schema → route file in `routes/` → transaction if
multi-write → test in `index.test.mjs` (success + validation + edge cases) →
`ApiService` method → store action with error toast.