# Project Coding Standards

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

Skills provide step-by-step workflows — **lazy-load only the 1-2 skills
relevant to your current task** (never load all 24). Discover via
`.github/SKILLS_INDEX.md`: `code-review-and-quality`, `test-driven-development`,
`incremental-implementation`, `code-simplification`, `debugging-and-error-recovery`,
and others in `.github/skills/`.