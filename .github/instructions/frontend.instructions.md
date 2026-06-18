---
applyTo: 'src/**'
---

# Frontend rules (Angular 22, zoneless, signals)

## Component recipe
Every component: standalone, `ChangeDetectionStrategy.OnPush`, signal APIs
(`input()`, `output()`, `model()`, `signal`, `computed`). No decorators-era
`@Input`/`@Output` in new code. Each component ships with a `.spec.ts`.

## Performance
- Never call methods from templates that recompute per change-detection
  cycle. Precompute per-item presentation values into a `computed()`
  view-model (pattern: `nodeVms` in `screens/network/network-graph.component.ts`).
- `@for` must track a stable identity, never `$index` on dynamic lists.
- Wrap heavy subtrees in `@defer` with a placeholder. In specs, render them
  via `fixture.getDeferBlocks()` + `DeferBlockState.Complete`.

## Resource lifetimes
- Timers inside `effect()` must be cleared with `onCleanup`.
- `requestAnimationFrame` loops and long-lived listeners are cancelled in
  `inject(DestroyRef).onDestroy(...)`.

## Layering (lint-enforced)
- Components get data through `AppStore`; only `data/api.service.ts` talks
  HTTP. Screens never inject `ApiService` directly unless the data is
  screen-local and read-only (e.g. search results) — prefer the store.
- `ui/` components must stay presentational: no `data/`, `screens/`, or
  `shell/` imports. Pass everything via inputs/outputs.
- Reuse `ui/` primitives (button, tabs, search-input, page-header, modal,
  popover, checkbox, status-badge, charts) before writing new inline UI.

## Styling
- **TailwindCSS v4** (`src/tailwind.css`) with a `@theme` block mapping all
  design tokens. Use utility classes (`text-fg-1`, `bg-amber`,
  `border-border-def`, `font-display`) in templates.
- Component `styles` arrays are minimal — only `:host` rules, `@keyframes`
  animations, and pseudo-elements that Tailwind cannot express.
- For dynamic/programmatic colors (SVG fills, viewport breakpoints), use
  constants from `ui/tokens.ts` (`C`, `BREAKPOINTS`, etc.).
- No hardcoded hex values in new components — use Tailwind theme tokens or
  arbitrary values (`text-[#22D3EE]`) for one-off cluster colors.

## Routing
- New screens: feature folder `screens/<feature>/`, lazy `loadComponent`,
  `title` property. Navigation always via `Router` / `routerLink`.
- The landing page renders outside `AppShellComponent`; app features nest
  under the shell layout route.

## Accessibility
- Interactive non-button elements need `role`, `tabindex`, keyboard handlers,
  and `aria-label`. No `autofocus`. Icon-only buttons need `aria-label`.
- Outputs must not shadow native DOM event names.

## Testing
- Use `screens/spec-helpers.ts` (`seedAppStore`) to prime the store through
  its real load path. `TestBed.tick()` flushes signal effects in zoneless
  mode. For ngModel-bound signals, assert the signal, not `input.value`.
