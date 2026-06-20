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

Skills provide step-by-step workflows — **lazy-load only the skills
relevant to your current task** (never preload all 24). Discover via
`.github/SKILLS_INDEX.md`: `code-review-and-quality`, `test-driven-development`,
`incremental-implementation`, `code-simplification`, `debugging-and-error-recovery`,
and others in `.github/skills/`.

## Design context

| What | Where |
|------|-------|
| Product strategy (register, users, principles, anti-references) | `PRODUCT.md` |
| Visual design system (colors, typography, elevation, components, do's/don'ts) | `DESIGN.md` |
| Live variant mode (in-browser iteration, pre-configured) | `/impeccable live` |

**Quick reference:** Neuranet is a **product** tool (design serves function).
Dark-native observatory — tonal navy layers, single beacon-gold accent
(`#FBBF24`, ≤10% of any screen), Space Grotesk + JetBrains Mono, square
geometry (`rounded-none`), no decorative shadows. See `DESIGN.md` for
the full system before generating new UI.