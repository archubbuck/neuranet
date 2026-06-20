---
name: "Neuranet"
description: "Dark observatory for topic network exploration — precision instrument, not consumer app."
colors:
  beacon-gold: "#FBBF24"
  beacon-gold-hover: "#FCD34D"
  beacon-gold-press: "#D97706"
  deep-navy: "#090E1C"
  navy-surface: "#0B1120"
  navy-elevated: "#0F1828"
  navy-overlay: "#152035"
  signal-white: "#F1F5F9"
  mute-slate: "#94A3B8"
  faint-slate: "#475569"
  deep-slate: "#2A3D66"
  ink-on-gold: "#06090F"
  emerald-signal: "#34D399"
  rose-alert: "#FB7185"
  info-blue: "#38BDF8"
  reddit-orange: "#FF6040"
  pdf-purple: "#C084FC"
typography:
  display:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  none: "0px"
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.beacon-gold}"
    textColor: "{colors.ink-on-gold}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.beacon-gold-hover}"
    textColor: "{colors.ink-on-gold}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
  button-secondary:
    backgroundColor: "{colors.navy-elevated}"
    textColor: "{colors.signal-white}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.mute-slate}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.rose-alert}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
---

# Design System: Neuranet

## 1. Overview

**Creative North Star: "The Dark Observatory"**

Neuranet is a precision instrument for seeing structure in noise. The interface is not a dashboard to check — it's an observatory to dwell in. Every surface, every spacing decision, every color assignment serves the analyst's deep-focus session: reduce glare, surface signal, eliminate distraction.

The system is **dark-native, flat, and typographic**. It rejects the SaaS dashboard aesthetic (gradient cards, widget chrome, decorative dropshadows) in favor of tonal depth: four navy layers that rise toward the analyst without shadows, and a single beacon-gold accent used sparingly — ≤10% of any given screen — so its presence always means *pay attention here*.

This is not dark mode as a theme toggle. It is dark as the environment: the observatory dome at night, lit only by the instrument panel and the data itself.

**Key Characteristics:**
- Tonal elevation over shadow elevation — depth through background color, not drop-shadow
- Single-accent restraint — beacon gold marks focus, selection, and primary action; nothing else competes
- Monospace data, sans-serif chrome — JetBrains Mono for values/status/metrics, Space Grotesk for labels/headings/navigation
- Square geometry throughout — rounded-none is the default; radius is earned, not assumed
- Information-dense without clutter — every pixel justifies its presence

## 2. Colors: The Observatory Palette

A restrained palette built on one accent (beacon gold) and four tonal navy layers. Semantic colors (emerald, rose, info) serve status signaling. The system explicitly rejects warm-tinted neutrals — the navy is tinted toward cool blue, the brand's own hue, not toward cream/sand/paper defaults.

### Primary
- **Beacon Gold** (`#FBBF24`): The sole accent. Used on primary buttons, active tab underlines, selected states, focus rings, and the network graph's highlight interactions. Deliberately scarce — its rarity is the point.

### Neutral
- **Deep Navy** (`#090E1C`): Page background. The observatory dome.
- **Navy Surface** (`#0B1120`): Card, modal, and sidebar base. One step above the void.
- **Navy Elevated** (`#0F1828`): Input fields, hovered rows, secondary buttons. The instrument panel surface.
- **Navy Overlay** (`#152035`): Dropdowns, tooltips, popovers. The furthest-forward layer before content.
- **Signal White** (`#F1F5F9`): Primary body text. ≥4.5:1 against Deep Navy.
- **Mute Slate** (`#94A3B8`): Secondary/meta text, inactive nav items, placeholder copy.
- **Faint Slate** (`#475569`): Tertiary text, disabled states, decorative dividers.
- **Deep Slate** (`#2A3D66`): Very faint text, subtle borders on dark surfaces.
- **Ink on Gold** (`#06090F`): Text on beacon-gold backgrounds — near-black for maximum contrast.

### Semantic
- **Emerald Signal** (`#34D399`): Success, active/healthy status, positive deltas.
- **Rose Alert** (`#FB7185`): Errors, destructive actions, negative deltas.
- **Info Blue** (`#38BDF8`): Informational highlights, links, discovery cues.
- **Reddit Orange** (`#FF6040`): Reddit source indicator — domain-specific.
- **PDF Purple** (`#C084FC`): PDF source indicator — domain-specific.

### Cluster Palette
Eight named hues for graph node coloring, each assigned a semantic domain:
cyan (`#22D3EE`, Tech/AI), violet (`#A78BFA`, Social), rose (`#FB7185`, Policy), emerald (`#34D399`, Research), orange (`#FB923C`, Media), sky (`#38BDF8`, Business), pink (`#F472B6`, Health), lime (`#A3E635`, Climate).

### Named Rules
**The Beacon Rule.** Beacon Gold appears on ≤10% of any given screen. Primary buttons, the active nav indicator, and graph highlights share this one color. If you need a second accent, you need a different hierarchy, not a different hue.

**The Observatory Rule.** Background surfaces are navy-tinted toward cool blue (hue ~230-240), never warm. The observatory is dark and cool; warmth comes exclusively from the beacon gold accent.

## 3. Typography

**Display/UI Font:** Space Grotesk (with system-ui, -apple-system, BlinkMacSystemFont, sans-serif fallback)
**Data/Label Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo, Consolas, monospace fallback)

**Character:** Space Grotesk brings geometric precision without sterility — its slightly quirked letterforms (angled terminals, distinctive 'G') give the interface personality without decoration. JetBrains Mono is the data voice: tabular figures, clear distinction between similar glyphs (0/O, 1/l/I), built for reading values at a glance.

### Hierarchy
- **Display** (600, `clamp(1.5rem, 4vw, 2.25rem)`, 1.15): Screen titles, hero headings. Appears once per screen. Letter-spacing: -0.02em.
- **Title** (600, `15px`, 1.3): Modal titles, card headers, section labels. The workhorse heading.
- **Body** (400/500, `13px`, 1.5): All UI copy, navigation labels, form text, descriptions. Max line length: 65-75ch in prose contexts.
- **Label** (400, `11px`, 1.4): Status badges, metric values, table data, timestamps. JetBrains Mono. Uppercase only when the data itself is uppercase (acronyms, codes).

### Named Rules
**The One Voice Rule.** Space Grotesk at one optical size and JetBrains Mono at one optical size. No third font family, no weight gymnastics. Hierarchy comes from size, color, and position — not from additional typefaces.

## 4. Elevation

Neuranet uses **tonal layering, not shadows**. Depth is conveyed through background color alone: surfaces get progressively lighter as they rise toward the user (Deep Navy → Navy Surface → Navy Elevated → Navy Overlay). This keeps the interface flat and reduces visual noise during sustained analytical work.

Drop shadows are reserved for two specific cases: the modal backdrop (a deep, diffuse shadow that separates the overlay from the page) and status-dot glows (small colored box-shadows that make status indicators legible at a glance). Neither is decorative; both are functional.

### Shadow Vocabulary
- **Modal shadow** (`0 24px 64px rgba(0,0,0,0.65)`): Only on the modal container. Signals "this surface is above everything."
- **Status glow** (`0 0 4-5px rgba(<semantic-color>, 0.4-0.5)`): Only on the 6px status dot. Makes the tiny indicator readable.
- **Brand glow** (`0 0 6px rgba(251,191,36,0.4)`): Only on the landing page logo mark. A deliberate exception for brand presence.

### Named Rules
**The Flat-By-Default Rule.** No surface carries a box-shadow at rest. Shadows appear only as a response to a specific functional need (modal separation, status legibility). If you're adding a shadow for "depth" or "polish," you're in the wrong system.

## 5. Components

### Buttons
- **Shape:** Square — `rounded: none` (`0px`). No radius, no pill, no rounding.
- **Primary:** Beacon gold background, near-black text. `px-3.5 py-2` (14px × 8px). `text-[13px] font-semibold`.
- **Secondary:** Navy elevated background, subtle border (`border-border-def`), signal white text.
- **Ghost:** Transparent background, mute slate text. On hover: `bg-bg-hover`, text → signal white.
- **Danger:** Transparent background, rose alert border and text. On hover: rose-tinted background.
- **Hover/Focus:** Color transitions at 150-200ms ease-out. Disabled: 40% opacity, default cursor.
- **All variants:** `inline-flex items-center justify-center gap-[7px]`. No uppercase transformation.

### Tabs
- **Style:** Underlined strip. Inactive: transparent bottom border 2px, mute slate text. Active: beacon gold bottom border 2px, beacon gold text.
- **Typography:** `text-[13px] font-semibold`. Icon + label layout with `gap-[7px]`.
- **Badge:** Optional count rendered in JetBrains Mono `text-[10.5px]` on navy overlay background.

### Search Input
- **Shape:** Square (`rounded-none`). Navy elevated background, subtle border. `h-[34px]`, `text-[13px]`.
- **Icon:** 14px search icon in faint slate (`#475569`), absolutely positioned left.
- **Placeholder:** Faint slate (`#475569`), matching the 4.5:1 contrast threshold.
- **Focus:** No ring — the border and background are the affordance. The system trusts the cursor.

### Modal
- **Shape:** Square container, navy surface background, subtle border. `max-h-[86vh]`, configurable width (default 460px).
- **Header:** Title (`text-[15px] font-semibold`) + optional subtitle (`text-xs text-fg-3`). Close button: 28×28px ghost.
- **Backdrop:** `rgba(6,9,15,0.6)` with `backdrop-blur-sm`.
- **Animation:** 200ms ease-out scale(0.94→1) + fade.
- **Footer:** Optional action bar with right-aligned buttons, separated by a subtle top border.

### Status Badge
- **Shape:** Inline flex container, navy hover background. `px-[10px] py-[4px]`.
- **Dot:** 6×6px colored circle with semantic glow (emerald for done, amber for fetching/idle, rose for error).
- **Typography:** JetBrains Mono `text-[11px]`, mute slate text.

### Navigation (Sidebar)
- **Style:** Collapsible (220px → 56px). Navy surface background, subtle right border.
- **Items:** 13px medium Space Grotesk, mute slate → signal white on hover. Active: beacon gold icon + text.
- **Header:** Neuranet wordmark in 13px semibold, beacon gold home arrow icon.
- **Transition:** 200ms width transition on collapse/expand.

## 6. Do's and Don'ts

### Do:
- **Do** use tonal elevation (bg-base → bg-surface → bg-elevated → bg-overlay) instead of box-shadows for depth.
- **Do** keep beacon gold on ≤10% of any screen — its scarcity gives it meaning.
- **Do** use JetBrains Mono for all data values, metrics, statuses, and timestamps.
- **Do** maintain `rounded-none` as the default; only apply radius when there's a specific functional reason.
- **Do** ensure body text meets ≥4.5:1 contrast against its background (Signal White on Deep Navy passes; Mute Slate on Deep Navy does not — use it only for secondary text at adequate size).
- **Do** respect `prefers-reduced-motion` — modal scale animations and hover transitions must degrade to instant.

### Don't:
- **Don't** use gradient text, glassmorphism, or decorative blurs — the system is flat and data-native.
- **Don't** add a second accent color. Beacon gold is the only accent. Semantic colors (emerald, rose, info) signal state, not brand.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items.
- **Don't** introduce rounded corners on interactive elements — `rounded-none` is intentional, not an oversight.
- **Don't** add drop shadows to cards, buttons, or surfaces at rest — per the Flat-By-Default Rule.
- **Don't** use warm-tinted backgrounds (cream, sand, beige, warm gray) — the observatory is cool-navy.
- **Don't** introduce additional font families beyond Space Grotesk and JetBrains Mono.
- **Don't** use SaaS marketing patterns: gradient heroes, stock illustrations, pricing tables with checkmarks, "the platform for X" taglines.
- **Don't** add gamification elements: achievements, confetti, playful mascots, or personality-driven microcopy.
- **Don't** use consumer-app patterns: large border-radius, pastels, bubbly interactions.
