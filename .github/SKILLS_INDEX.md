# Skills Index

> **Lazy-load only:** Skills are 200-400 lines each. Load only the 1-2 skills
> relevant to your current task — never preload all 24. Use this index to discover
> which skill applies, then read only that skill's file.

Prioritized guide for which skills to load into limited context windows.
Skills are invoked via subagent, slash command, or direct reference.

## Tier 1 — Essential (invoke on most tasks)

| Skill | When to invoke |
|-------|---------------|
| [`test-driven-development`](skills/test-driven-development/SKILL.md) | Any new logic, bug fix, or behavior change — write a failing test first |
| [`incremental-implementation`](skills/incremental-implementation/SKILL.md) | Multi-file changes, features touching >1 layer |
| [`code-review-and-quality`](skills/code-review-and-quality/SKILL.md) | Before merging any change — five-axis review |
| [`debugging-and-error-recovery`](skills/debugging-and-error-recovery/SKILL.md) | Test failures, build breaks, unexpected behavior |

## Tier 2 — Situational (invoke when domain applies)

| Skill | When to invoke |
|-------|---------------|
| [`api-and-interface-design`](skills/api-and-interface-design/SKILL.md) | Designing new endpoints, type contracts, or module boundaries |
| [`frontend-ui-engineering`](skills/frontend-ui-engineering/SKILL.md) | Building or modifying user-facing interfaces |
| [`security-and-hardening`](skills/security-and-hardening/SKILL.md) | User input handling, auth, external integrations, data storage |
| [`performance-optimization`](skills/performance-optimization/SKILL.md) | Profiling, Core Web Vitals, load time improvements |
| [`spec-driven-development`](skills/spec-driven-development/SKILL.md) | New feature with unclear requirements, before any code is written |
| [`planning-and-task-breakdown`](skills/planning-and-task-breakdown/SKILL.md) | Breaking large work into ordered, implementable tasks |
| [`code-simplification`](skills/code-simplification/SKILL.md) | Refactoring for clarity without changing behavior |
| [`documentation-and-adrs`](skills/documentation-and-adrs/SKILL.md) | Architectural decisions, public API changes, recording context |
| [`deprecation-and-migration`](skills/deprecation-and-migration/SKILL.md) | Removing old APIs, migrating users between implementations |
| [`ci-cd-and-automation`](skills/ci-cd-and-automation/SKILL.md) | Setting up or modifying build/deployment pipelines |
| [`shipping-and-launch`](skills/shipping-and-launch/SKILL.md) | Production deployment, monitoring setup, rollback planning |
| [`browser-testing-with-devtools`](skills/browser-testing-with-devtools/SKILL.md) | DOM inspection, console errors, network analysis, visual verification |
| [`source-driven-development`](skills/source-driven-development/SKILL.md) | Building with authoritative, source-cited code — correctness-critical work |
| [`git-workflow-and-versioning`](skills/git-workflow-and-versioning/SKILL.md) | Branching, committing, conflict resolution, parallel work streams |

## Tier 3 — Rare / Meta (invoke for process or tooling)

| Skill | When to invoke |
|-------|---------------|
| [`context-engineering`](skills/context-engineering/SKILL.md) | Configuring agent context, switching tasks, output quality degradation |
| [`using-agent-skills`](skills/using-agent-skills/SKILL.md) | Discovering which skill applies to the current task |
| [`doubt-driven-development`](skills/doubt-driven-development/SKILL.md) | High-stakes correctness-critical work, unfamiliar code |
| [`fable-mode`](skills/fable-mode/SKILL.md) | Explicit staged execution across many files/sources |
| [`idea-refine`](skills/idea-refine/SKILL.md) | Stress-testing assumptions, refining vague ideas before planning |
| [`interview-me`](skills/interview-me/SKILL.md) | Underspecified asks — extracting real intent before building |

## Framework Mapping

Generic examples in skill bodies may reference frameworks not used by this project.
Translate as follows:

| Generic example | This project |
|----------------|-------------|
| Prisma ORM / Prisma schema | Drizzle ORM (`server/db/schema.ts`, `repositories/*.repo.ts`) |
| Jest / React Testing Library | Vitest + Angular TestBed + HttpTestingController |
| React / Next.js / JSX | Angular 22 (zoneless, signals, OnPush, standalone) |
| CSS Modules / styled-components | TailwindCSS v4 (`src/tailwind.css` theme tokens) |
| npm / yarn | pnpm 11 |
| supertest | `app.listen(0)` + native `fetch()` |
| Karma / Jasmine | Vitest (`describe`/`it`/`expect` from `vitest`) |
| Prisma migrations | Drizzle migrations (`pnpm db:migrate`) |

## Canonical Rules (read these before any skill)

| What | Where |
|------|-------|
| Shared principles | [`.github/principles.md`](principles.md) |
| Frontend rules | [`.github/instructions/frontend.instructions.md`](instructions/frontend.instructions.md) |
| Backend rules | [`.github/instructions/backend.instructions.md`](instructions/backend.instructions.md) |
| UI primitive rules | [`.github/instructions/ui-primitives.instructions.md`](instructions/ui-primitives.instructions.md) |
| Architecture decisions | [`docs/adr/`](../docs/adr/) |
