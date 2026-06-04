# ProtoLive Design System

## Theme

Use a bright "maker lounge": daytime, natural light, an encouraging place to share a rough-but-live build and get feedback. Light, not dark. Avoid the SaaS reflexes for this category (Product Hunt coral on white, playful purple gradients, indie-hacker beige). No glassmorphism as default, no decorative glow fields, no gradient text, no shimmer or mix-blend.

## Color Strategy

Restrained base plus one committed brand hue, all in OKLCH (never pure `#000`/`#fff`; tint neutrals toward ink-blue):

- Background: linen white (`oklch(98.4% 0.006 95)`), raised surface a touch lighter, sunken a touch darker.
- Text: ink-blue ramp (`oklch(28% 0.02 250)` strong → faint), not black.
- Primary action: warm sap green (`oklch(58% 0.13 150)`) for proof and action; chosen because sap green is rare as a SaaS primary, so it dodges the category reflex.
- Link/secondary: ink-blue accent (`oklch(64% 0.14 250)`), hue-separated from primary.
- Signal colors read at a glance: maturity badges (early violet / building green / live amber), upvote ember, success green hue-separated from primary.
- Semantic: success / warning / error / info each its own hue with light tint + readable dark text.

## Typography

System UI stack is acceptable for product density. Favor clear hierarchy, short labels, and readable Korean copy. Avoid oversized hero typography inside tool surfaces.

## Layout

The first viewport is a working dashboard, not a marketing hero. Use asymmetric dashboard bands, a live signal rail, and project rows/cards only when the item is actionable. Do not nest cards.

## Interaction

All async actions need visible loading, success, and failure states. Use transform and opacity for motion, short easing curves, and `prefers-reduced-motion` support.

## Trust And Protection

Treat pre-launch IP exposure as a first-class workflow, not a footnote. Registration should clearly show exposure modes, default to screened access, require acknowledgement, and use amber caution styling for risk notices. Protected projects should look investable, but preview/open affordances must become access-request actions instead of dead controls.
