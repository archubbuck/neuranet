# Shared Coding Principles

Canonical source for rules that apply across the entire codebase. Layer-specific
rules live in `.github/instructions/`. Specialized workflows live in
`.github/skills/` and `.github/agents/`.

---

## Code Review — Five Axes

Every change is evaluated across five dimensions. For the full review protocol
see `.github/skills/code-review-and-quality/SKILL.md` and the `code-reviewer`
agent (`.github/agents/code-reviewer.md`).

1. **Correctness** — Does it match the spec? Edge cases handled? Error paths
   covered? Tests prove behavior.
2. **Readability** — Can another engineer understand it without explanation?
   Names descriptive, control flow straightforward, no dead code.
3. **Architecture** — Does it follow existing patterns? Module boundaries
   maintained? Abstraction level appropriate? Dependencies flow correctly.
4. **Security** — Input validated at boundaries? Secrets kept out of
   code/logs/version control? Auth checked where needed? Queries parameterized?
5. **Performance** — No N+1 queries, unbounded loops, missing pagination, or
   unnecessary re-renders.

## Testing

- **TDD**: Write a failing test before the implementation. See
  `.github/skills/test-driven-development/SKILL.md` for the full RED-GREEN-REFACTOR
  cycle.
- **Prove-It pattern**: For bugs, reproduce with a failing test before fixing.
- **Test hierarchy**: Prefer unit > integration > e2e. Use the lowest level
  that captures the behavior.
- **Run tests after every change**: `pnpm test` (frontend), `pnpm test:server`
  (backend).

## Implementation

- **Build in small, verifiable increments.** Each slice:
  implement → test → verify → commit. See
  `.github/skills/incremental-implementation/SKILL.md`.
- **Never mix formatting changes with behavior changes.** Separate commits.

## Boundaries

| Rule | Scope |
|------|-------|
| Always | Run tests before commits. Validate user input. |
| Ask first | Database schema changes. New dependencies. |
| Never | Commit secrets. Remove failing tests. Skip verification. |

## PR Quality Gates

Every PR must pass (enforced by `.github/workflows/ci.yml`):
- Lint (`pnpm lint`)
- Type check (`pnpm typecheck`)
- Tests (`pnpm test` + `pnpm test:server`)
- Build (`pnpm build`)

## Architecture Decisions

Recorded in `docs/adr/`. Read the relevant ADR before changing an area. Add a
new ADR when making an architectural decision.
