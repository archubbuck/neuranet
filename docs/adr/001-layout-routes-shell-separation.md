# ADR 001 — Layout routes: landing outside the app shell, lazy screens

Date: 2026-06-10 · Status: accepted

## Context

`App` originally hardcoded `<app-shell />` and every route (including the
marketing-style landing page at `/`) rendered inside the shell's
`<router-outlet>`. The landing page therefore got the sidebar chrome and
triggered the shell's `AppStore.loadAll()` bootstrap. All screens were
eagerly imported in `app.routes.ts`, inflating the initial bundle.

## Decision

- `App` renders a bare `<router-outlet />`.
- `/` maps directly to `LandingScreenComponent` — no shell, no data
  bootstrap.
- All app features nest as children of a parent layout route whose
  component is `AppShellComponent`; the shell's constructor kicks off
  `loadAll()` only when an app route is first activated.
- Every route uses lazy `loadComponent: () => import(...)` and declares a
  `title`.

## Consequences

- Initial bundle shrank to ~78 kB transfer; each screen is its own chunk.
- Navigation is exclusively router-driven. The store's legacy
  `screen`/`setScreen` state was deleted; anything that "switches screens"
  must call `Router.navigate` (e.g. search result pick → `/network`).
- Post-submit navigations must target `/network`, not `/` (which is now
  the landing page).
