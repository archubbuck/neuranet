---
applyTo: 'src/app/ui/**'
---

# UI primitive rules

Components in `ui/` are the design system. They must be:

- **Dumb**: inputs/outputs/models only. No `AppStore`, `ApiService`,
  `Router`, or any import from `data/`, `screens/`, `shell/`
  (lint-enforced). Domain-shaped data is passed in pre-formatted, or the
  primitive defines its own local type (see `BadgeStatus` in
  `status-badge.component.ts`).
- **Token-styled**: CSS custom properties with fallbacks
  (`var(--c-amber, #fbbf24)`); constants from `ui/tokens.ts` in TS code.
  No new raw hex values.
- **Accessible by default**: keyboard interaction, `aria-*` on icon-only
  controls, no `autofocus`, outputs never named after native DOM events.
- **Tested**: every primitive has a spec covering rendering and each
  output.

Folder layout: `primitives/` (form controls, headers, tabs, badges),
`overlays/` (modal, popover, toast), `charts/` (donut, hbar-list,
sent-bars, stat-card). `tokens.ts`, `icons.ts`, and `table-sort.ts` stay at
the `ui/` root.

Before adding a primitive, check whether an existing one can be extended
with an input instead.
