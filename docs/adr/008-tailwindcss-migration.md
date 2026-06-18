# ADR 008 — TailwindCSS migration for styling

Date: 2026-06-17 · Status: accepted

## Context

The project used CSS custom properties (`var(--c-amber)`) defined in `src/styles.css` and
`src/app/ui/tokens.ts`, with component styles in inline `styles` arrays. This approach had several
drawbacks:

- **Duplicate token definitions** — colors were declared in both `tokens.ts` (TypeScript) and
  `styles.css` (CSS custom properties), requiring manual synchronization.
- **Verbose component styles** — every component carried its own `styles` array with hand-written
  CSS, leading to visual inconsistencies and high maintenance.
- **No design system constraints** — nothing prevented new components from using hardcoded colors
  not in the token set.

## Decision

Adopt **TailwindCSS v4** with CSS-first configuration as the project's styling framework.

### Implementation

1.  **Configuration**: Tailwind is configured via `@import "tailwindcss"` + `@theme` block in
    `src/tailwind.css`. No separate `tailwind.config.js` — Tailwind v4 uses CSS-first config.

2.  **Build pipeline**: `@angular/build:application` (esbuild) processes styles through
    `postcss.config.js` with `@tailwindcss/postcss`.

3.  **Design tokens mapped to `@theme`**: All existing color tokens (`--c-amber`, `--c-bg-base`,
    etc.) are mapped as Tailwind theme values, making them available as utility classes:
    `text-amber`, `bg-bg-base`, `border-border-def`, `font-display`, `font-mono`.

4.  **Legacy backward compatibility**: The old `--c-*` custom properties remain defined in
    `:root` within `tailwind.css` so that any non-migrated component references still resolve.

5.  **Migration scope**: Every component's `styles` array was replaced with Tailwind utility
    classes directly in templates. The only remaining CSS in component `styles` is for:
    `:host` rules, `@keyframes` animations, and pseudo-elements that Tailwind cannot express.

### Files changed
- `src/tailwind.css` — new entry point (replaces `src/styles.css`)
- `angular.json` — `"styles": ["src/tailwind.css"]`
- `postcss.config.js` — new file, enables `@tailwindcss/postcss`
- `package.json` — added `tailwindcss` + `@tailwindcss/postcss`
- `src/styles.css` — deleted (content merged into `tailwind.css`)
- All 38+ component `.ts` files — `styles` arrays converted to Tailwind utility classes
- `src/app/screens/landing/landing-screen.component.css` — deleted (converted to Tailwind)
- `src/app/screens/landing/landing-screen.component.html` — deleted (inlined into `.ts`)
- `src/app/ui/tokens.ts` — updated comment to reflect new Tailwind workflow
- Multiple `.spec.ts` files — CSS-class-based selectors updated to Tailwind equivalents

## Consequences

- **Smaller CSS bundle**: Tailwind generates only used classes (JIT), and component `styles` arrays
  are now minimal or empty.
- **Consistent design system**: The `@theme` block is the single source of truth for colors,
  fonts, and spacing.
- **Self-documenting markup**: Utility classes in templates make styling intent visible without
  cross-referencing a separate CSS file.
- **TypeScript-only token usage**: `C`, `FONT`, `MONO`, `CLUSTER_COLORS`, `BREAKPOINTS`, and `RADII`
  remain in `tokens.ts` for programmatic use (SVG node colors, viewport breakpoints, etc.).
- **No `@apply` usage**: Utility classes are used directly in templates for clarity.
- **Migration risk**: SVG-heavy components (`network-graph`, `donut-chart`) retain dynamic
  computed bindings in TypeScript; only static layout was migrated.
