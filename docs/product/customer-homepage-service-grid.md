# Customer Homepage Service Grid

Task 53 refines the KariGO Customer App homepage into a compact service-grid experience.

## Active Service Tiles

The homepage service order is:

1. Food Delivery
2. Groceries
3. Taxi
4. Market Items
5. Pharmacy
6. Parcel Delivery
7. SME Services
8. Airtime
9. Data
10. Electricity
11. Cable TV

Active services route to existing customer flows:

- Food Delivery: food/vendor discovery
- Groceries: grocery/vendor discovery
- Market Items: market/vendor discovery
- Parcel Delivery: send parcel/package flow
- SME Services: service-provider request flow for approved skilled providers such as painters, plumbers, mechanics, electricians, cleaners, carpenters, AC technicians and generator repair technicians

## Readiness-Gated Services

The following services are visible but not live:

- Taxi
- Airtime
- Data
- Electricity
- Cable TV
- Pharmacy, unless explicitly enabled by `EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED=true`

Readiness-gated tiles route to controlled coming-soon screens. They must not show blank pages, start transactions, request taxi rides, initiate bill payment, or connect to provider APIs.

## Visual Rules

- Use compact icon tiles, usually two or three columns depending on screen width.
- Keep the greeting:
  - `Welcome, [First Name]`
  - `Here are top picks for you.`
- Keep `Today's featured for you` below the service grid.
- Keep labelled campaign/ad placement below featured content.
- Keep bottom navigation as: Home, Browse, Cart, Orders, Profile.
- Keep profile/address/support actions under Profile instead of dense homepage quick links.

## Future Work

Before enabling readiness-gated services, KariGO needs operational approval, provider selection, sandbox tests, security review, support playbooks and go-live authorization.
