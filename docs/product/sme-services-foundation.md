# SME Services Foundation

Task 72 replaces the old SME service wording with SME Services and separates it from Parcel Delivery.

## Product Boundary

Parcel Delivery is for sending parcels and packages between pickup and delivery addresses.

SME Services is for requesting approved skilled service providers for a home, shop or business location. The staging foundation supports request intake only; it does not assign providers, collect service payments, automate quotes, or dispatch workers.

## Initial Service Types

- Painter
- Plumber
- Mechanic
- Electrician
- Cleaner
- Carpenter
- AC technician
- Generator repair technician
- Other approved service provider

Doctor / health professional remains readiness-only. KariGO must not activate this category as live healthcare booking until management, legal, compliance, provider verification and operational approval are complete.

## Backend Foundation

Customer endpoints:

- `GET /api/v1/service-provider-requests/catalogue`
- `POST /api/v1/service-provider-requests`
- `GET /api/v1/service-provider-requests/my-requests`
- `GET /api/v1/service-provider-requests/:requestId`

The backend verifies that the authenticated customer owns the selected service address. Customers can view only their own SME Services requests.

## Customer App Foundation

The Customer App now exposes a distinct SME Services screen at `/sme-services`.

The screen collects:

- Service provider category
- Saved service address
- Service description
- Contact phone number
- Optional preferred date
- Optional preferred time window
- Optional customer note

Health professional booking is blocked with clear readiness-only copy.

## Launch Notes

- Do not connect live service-provider payments yet.
- Do not assign providers automatically yet.
- Do not activate regulated medical or health booking.
- Do not mix SME Services with the parcel/package request interface.
- Future work should add admin review, provider onboarding, provider assignment, pricing/quote rules and operational service completion controls.
