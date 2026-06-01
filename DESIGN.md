# ProtoLive Design System

## Theme
Use a focused, late-night diligence workspace: dark enough for live demo review, but not neon SaaS. Avoid purple-blue gradient dominance, glassmorphism as default, decorative glow fields, and gradient text.

## Color Strategy
Use tinted neutrals with a full semantic palette:
- Background: near-ink neutral with slight green/blue tint.
- Primary action: acidic chartreuse for proof and action.
- Secondary signal: cyan for live network telemetry.
- Deal signal: amber for funding intent.
- Error: red/coral with plain language recovery.

Use OKLCH values where practical. Do not use pure `#000` or `#fff`.

## Typography
System UI stack is acceptable for product density. Favor clear hierarchy, short labels, and readable Korean copy. Avoid oversized hero typography inside tool surfaces.

## Layout
The first viewport is a working dashboard, not a marketing hero. Use asymmetric dashboard bands, a live signal rail, and project rows/cards only when the item is actionable. Do not nest cards.

## Interaction
All async actions need visible loading, success, and failure states. Use transform and opacity for motion, short easing curves, and `prefers-reduced-motion` support.

## Trust And Protection
Treat pre-launch IP exposure as a first-class workflow, not a footnote. Registration should clearly show exposure modes, default to screened access, require acknowledgement, and use amber caution styling for risk notices. Protected projects should look investable, but preview/open affordances must become access-request actions instead of dead controls.
