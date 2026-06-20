# Product

## Register

product

## Users

Analysts and researchers exploring topic trends and relationships in document collections (Reddit threads, web articles, PDFs). They work in sustained analytical sessions — comparing clusters, tracing connections, identifying emergent themes. Their context is deep-focus work: long screen sessions, data-dense views, need for precision over polish.

## Product Purpose

Neuranet ingests documents, derives topic clusters and relationships, and renders them as an interactive network graph. It exists to make the invisible structure of large text collections visible and explorable. Success means an analyst can go from raw documents to actionable insights about topic relationships in minutes, not hours.

## Brand Personality

**Bold, energetic, exploratory.** The interface encourages discovery — it's not a passive dashboard to check, it's a space to investigate. Voice is precise and confident, never chatty or hand-holding. The design communicates: "the data is interesting, dive in."

## Anti-references

- **SaaS marketing templates** — gradient heroes, stock illustrations, pricing tables with checkmarks, "the platform for X" taglines
- **Gamified/gimmicky interfaces** — no achievements, confetti, playful mascots, or personality-driven microcopy
- **Consumer social apps** — no rounded-everything, pastels, bubbly interactions, or engagement-hack patterns
- **Widget-overload dashboards** — data-viz eye candy that prioritizes looking impressive over being legible

## Design Principles

1. **Show, don't tell.** The graph is the interface. Data speaks directly through visualization; chrome and explanation are secondary.
2. **Expert confidence.** Precise and analytical. No hand-holding, no gamification, no "delightful" fluff. The interface trusts the user's intelligence.
3. **Density with clarity.** Information-rich without feeling cluttered. Every pixel earns its place. Follows the Grafana/Datadog lineage: dense but scannable.
4. **Dark precision.** The dark background is functional — it reduces glare for sustained analytical sessions and lets the amber-accented graph data pop. Not "dark mode as aesthetic," dark as tool-native.
5. **Exploration-first.** The primary posture is active discovery, not passive consumption. Navigation, filtering, and graph interaction are the core experience; everything else supports that.

## Accessibility & Inclusion

- **Target: WCAG 2.2 AA.** Minimum contrast ratios, keyboard navigation, focus indicators, target size compliance.
- **Reduced motion:** All animations must respect `prefers-reduced-motion`.
- **Color independence:** Graph data must be distinguishable beyond color alone (shapes, labels, patterns as fallbacks for the cluster palette).
- **Screen reader:** Network graph must provide accessible text alternatives for the spatial relationships it renders visually.
