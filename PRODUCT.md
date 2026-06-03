# ProtoLive Product Context

## Register

product

## Users

ProtoLive serves two groups: makers who need to prove a prototype is already live, and investors who want to inspect working products before starting a funding conversation. Their shared job is to reduce pitch-deck noise and move quickly from proof to diligence.

## Product Purpose

The product is a live-prototype investment marketplace. A project should enter the market only after its public demo URL is verified by the backend, and investors should be able to review live status, open the demo, preview it in context, and send structured intent.

Pre-commercial services need a safer path than full public exposure. ProtoLive defaults to screened access: it verifies the real URL server-side, masks the URL in public responses, and shifts live preview/open actions into a match-request flow unless the maker explicitly chooses public preview.

## Brand Personality

Evidence-led, sharp, and premium. The interface should feel like an investor diligence cockpit, not a generic startup directory.

## Design Principles

- Lead with proof: verified URL telemetry, response timing, and fresh status should be visible before decorative claims.
- Avoid fake certainty: metrics must be computed from API state, not static marketing numbers.
- Keep the market fast: browsing, filtering, refreshing, previewing, and matching should be one-motion actions.
- Make empty states useful: when there are no projects, the interface should guide makers toward the next verified submission.
- Differentiate through live signals: benchmark direction comes from live feeds, attention signals, demo-first discovery, and structured deal flow.
- Protect early products: make exposure level explicit, require maker acknowledgement, and never imply that a public URL can be fully protected once it is already reachable on the internet.
