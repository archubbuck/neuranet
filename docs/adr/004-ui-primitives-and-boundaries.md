# ADR 004 — UI primitive layer with lint-enforced boundaries

Date: 2026-06-10 · Status: accepted

## Context

The three management screens each carried near-identical inline copies of
the page header, search input, tab strip, and button styles, plus their
own `fmtK` helpers. `ui/` components occasionally imported domain types
from `data/`, blurring the layer boundary.

## Decision

- `src/app/ui/` is the design system, grouped as `primitives/`,
  `overlays/`, `charts/` (+ `tokens.ts`, `icons.ts`, `table-sort.ts` at the
  root). Components there are dumb (inputs/outputs only), token-styled,
  accessible by default, and individually spec'd.
- Layer boundaries are mechanical, not aspirational:
  `eslint.config.js` blocks `ui/ → data|screens|shell` and
  `data/ → screens|ui|shell` imports, and `max-lines` caps component
  growth (legacy oversized screens have an enumerated frozen ceiling).
- Screens compose primitives; shared formatting lives in `core/format.ts`.
- Feature folders: one directory per routed screen under `screens/`, with
  feature-private children (e.g. categories' split/new modals) colocated.

## Consequences

- A future contributor (human or agent) physically cannot reintroduce
  HTTP-in-UI or god components without CI failing.
- Adding UI starts with "extend an existing primitive" before writing
  anything inline.
