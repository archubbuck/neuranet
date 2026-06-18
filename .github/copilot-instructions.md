# Project Coding Standards

## Essential rules

These are the most important rules that apply broadly. Read the canonical
sources below for full detail.

### Component recipe (every component)
- Standalone, `ChangeDetectionStrategy.OnPush`, signal APIs (`input()`,
  `output()`, `signal`, `computed`). No `@Input`/`@Output` decorators in
  new code.
- Template: TailwindCSS v4 utility classes (`text-fg-1`, `bg-amber`).
  Dynamic TS colors from `ui/tokens.ts`. No raw hex values.
- Layer: `ui/` components must stay presentational (no `data/`, `screens/`,
  `shell/` imports). `screens/` get data through `AppStore`.

### Backend conventions
- Every POST/PUT body gets a zod schema in `server/schemas.ts`, applied via
  `validateBody` middleware. No manual `typeof` checks.
- Multi-write handlers wrap in `db.transaction()`. Routes call repository
  methods — never import Drizzle directly.
- All env reads through `server/env.ts`/`server/config.ts`. No `process.env`
  outside those files.
- External fetches use SSRF-safe host allowlist (exact-match + subdomain).
  Auth endpoints use `requireAuth` from `server/middleware/auth.ts`.

### Testing
- Frontend: Vitest + TestBed + HttpTestingController (`src/app/**/*.spec.ts`).
  `TestBed.tick()` flushes signal effects in zoneless mode.
- Backend: `.test.ts` files, `app.listen(0)` for random port, native `fetch()`.
  Tables truncated in `beforeEach` via Drizzle `delete()`.

### Boundaries
- `ui/` → must NOT import from `data/`, `screens/`, `shell/`
- `data/` → must NOT import from `screens/`, `ui/`, `shell/`
- **PR gates** (CI): lint → typecheck → tests → build
- **Never:** commit secrets, remove failing tests, skip verification
- **Ask first:** DB schema changes, new dependencies

## Canonical sources (read these first)

| What | Where |
|------|-------|
| Shared principles (review axes, TDD, increments, boundaries, PR gates) | `.github/principles.md` |
| Frontend rules (components, layering, styling, routing, testing) | `.github/instructions/frontend.instructions.md` |
| Backend rules (layering, validation, data integrity, security, testing) | `.github/instructions/backend.instructions.md` |
| UI primitive rules (design system, token styling, accessibility) | `.github/instructions/ui-primitives.instructions.md` |
| Architecture decisions | `docs/adr/` |

## Agents & skills

Specialized personas for review workflows — invoke via subagent or slash command:

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Five-axis review before merge |
| `security-auditor` | Vulnerability detection, OWASP-style audit |
| `test-engineer` | Test strategy, coverage analysis, Prove-It pattern |

Skills provide step-by-step workflows:
`code-review-and-quality`, `test-driven-development`, `incremental-implementation`,
`code-simplification`, `debugging-and-error-recovery`, and others in
`.github/skills/`.