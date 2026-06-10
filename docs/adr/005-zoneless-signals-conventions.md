# ADR 005 — Zoneless signals app: view-model precompute convention

Date: 2026-06-10 · Status: accepted

## Context

The app is zoneless (`provideZonelessChangeDetection`) with OnPush
standalone components. The network graph originally called per-element
helper methods (`edgeStroke`, `nodeOpacity`, `labelSize`, …) from its SVG
template — every element re-ran every helper on every change-detection
cycle. Cleanup of timers and rAF loops was inconsistent, leaking work
after navigation.

## Decision

- Per-item presentation values are precomputed in `computed()` view-models
  (`nodeVms`/`edgeVms` pattern in `network-graph.component.ts`). Template
  bindings read plain properties; helper methods in templates are limited
  to O(1) lookups that don't allocate.
- Effects that schedule timers register `onCleanup`; rAF loops and global
  listeners are cancelled via `DestroyRef.onDestroy`.
- Heavy subtrees (`<app-network-graph>`) load inside `@defer` with a
  skeleton placeholder; specs drive them with `DeferBlockState.Complete`.
- `@for` tracks stable identity, never `$index` on dynamic lists.

## Consequences

- Render cost scales with state changes, not template size.
- Specs assert lifecycle hygiene (e.g. "cancels the animation frame loop
  on destroy"), so regressions are caught at unit level.
