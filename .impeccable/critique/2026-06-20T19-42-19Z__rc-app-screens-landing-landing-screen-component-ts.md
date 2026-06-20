---
target: src/app/screens/landing/landing-screen.component.ts
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-06-20T19-42-19Z
slug: rc-app-screens-landing-landing-screen-component-ts
---
## Design Critique: Landing Page

**Target:** `src/app/screens/landing/landing-screen.component.ts`
**Date:** 2026-06-20

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Waitlist form has a clear submitted state; no loading feedback on submit |
| 2 | Match System / Real World | 3 | Graph/network metaphor maps well to analyst mental model |
| 3 | User Control and Freedom | 3 | Anchor nav + mobile toggle; clear section navigation |
| 4 | Consistency and Standards | 4 | Design system faithfully applied — same buttons, type, spacing throughout |
| 5 | Error Prevention | 2 | Email input has no inline validation or error message pattern |
| 6 | Recognition Rather Than Recall | 3 | Source types icon-labeled; "how it works" diagram needs more guidance |
| 7 | Flexibility and Efficiency | 4 | Anchor nav, responsive, single clear CTA — efficient for a marketing page |
| 8 | Aesthetic and Minimalist Design | 4 | Strongest dimension — distinctive dark observatory aesthetic, beautiful SVG graphs |
| 9 | Error Recovery | 1 | No visible error states for waitlist API failure or network errors |
| 10 | Help and Documentation | 2 | Page explains the product well but no contextual help or tooltips |
| **Total** | | **29/40** | **Good** |

### Anti-Patterns Verdict

**LLM assessment:** This landing page is authored, not generated. The dark observatory aesthetic, the hand-crafted SVG graph illustrations with mouse-hover interactivity, the specific product vocabulary, and the restrained use of the amber accent all feel deliberate. The page carries a strong personality.

Two patterns drift toward SaaS-template territory:
- Stats strip (12.4M / 48,212 / 1,380 / 4 min) is the hero-metric template — big number, small label, no source.
- Three identical step cards in "How it works" — same shape, same hover, same internal structure.

**Deterministic scan:** 9 hits, all `Color outside DESIGN.md` — cluster palette colors used in the hero SVG and app preview graph. These are false positives — they're documented in DESIGN.md's Cluster Palette section but missing from the YAML `colors:` frontmatter.

### Overall Impression

The landing page is strong — distinctive, cohesive, and clearly communicates what Neuranet does. The hero SVG graph with hover interactivity is the standout element. The app preview mockup is detailed and convincing.

The single biggest opportunity: the page has no bottom-of-page conversion path. Users who scroll to learn more find a footer with no CTA.

### Strengths

1. Hero SVG graph with hover interactivity — beautiful, distinctive, instantly communicates the product.
2. App preview mockup — detailed "Climate research workspace" preview with realistic data.
3. Comparison table with amber-tinted Neuranet column — makes the value proposition scannable.

### Priority Issues

- **[P1] No bottom-of-page CTA.** The waitlist form only appears in the hero. Users who scroll through the entire page end at a sparse footer with no conversion path.
- **[P1] Stats strip is a SaaS trope.** Big numbers with tiny labels, no source, no context — reads as marketing fluff, undermining the "precision instrument" personality.
- **[P2] No error or loading states on the waitlist form.** No loading spinner on submit, no error state for API failure.
- **[P2] "How it works" SVG diagram is hard to parse.** Single-canvas layout requires decoding a complex composition.
- **[P3] Rounded corners on interactive elements conflict with the design system.** Waitlist input and CTA use `rounded-md`; app preview cards use `rounded-lg`/`rounded-xl`. Design system mandates `rounded-none`.

### Persona Red Flags

**Alex (Power User / Analyst):** Stats strip numbers feel like marketing fluff with no source. Hero SVG graph sets an expectation of interactivity the page doesn't fulfill. Comparison table is the strongest element for this persona.

**Jordan (First-Timer / Curious Researcher):** Hero immediately communicates what the product does. "How it works" diagram is information-dense and could overwhelm. No "see it in action" or demo path.

### Minor Observations

- "S1 2026" quarter duplicates with "Q2 2026" in roadmap.
- Footer feels unfinished — no logo, no navigation recap.
- Hero heading at 78px clamp max may feel oversized at intermediate viewports.
- Stats labels have unnecessary `tracking-[0.03em]`.

### Questions to Consider

- What if the stats strip were replaced with a single testimonial quote?
- What would a "confident" version of the stats look like — one an analyst would trust?
- Should the "how it works" diagram animate on scroll to guide the user?
- Does the page need a demo video or "see it in action" section?
