# Taxi Readiness Architecture

KariGO Taxi is a readiness-only foundation for future ride-hailing operations. It lets customers join a Taxi waitlist and lets prospective drivers submit onboarding details for review. It does not enable live taxi booking, driver matching, fare calculation, GPS tracking, wallet balances, SOS features, ride earnings or taxi payments.

## Scope Included

- Public customer Taxi waitlist collection.
- Public Taxi driver readiness application collection.
- Public driver application status lookup by phone number.
- Admin review of Taxi driver readiness applications.
- Admin follow-up status management for customer Taxi waitlist entries.
- Audit logging for admin review/status actions.
- Customer App waitlist flow.
- Rider App readiness application/status flow.
- Admin Portal Taxi readiness page.
- Public website Taxi waitlist and driver application forms.

## Scope Excluded

- Live taxi dispatch.
- Driver matching.
- Fare engine.
- Maps, GPS or route pricing.
- Live ride status lifecycle.
- Taxi payment, wallet, card or bank transfer flow.
- Taxi-specific rider earnings.
- SOS, emergency escalation or live safety operations.

## Backend Components

- Prisma models:
  - `TaxiDriverApplication`
  - `TaxiWaitlistEntry`
- Prisma enums:
  - `TaxiApplicationStatus`
  - `TaxiWaitlistStatus`
  - `TaxiVehicleType`
  - `TaxiVehicleOwnership`
- Module:
  - `services/backend-api/src/modules/taxi`

## Frontend Surfaces

- Customer App:
  - Taxi tile remains a coming-soon readiness path.
  - `Join Taxi Waitlist` opens a customer waitlist form.
- Rider App:
  - Dashboard shows a Taxi Driver Readiness card.
  - Rider can submit readiness details and check status.
  - No taxi mode switching is active.
- Admin Portal:
  - Taxi page has Driver Applications and Customer Waitlist sections.
  - Admin review is readiness-only.
- Public Website:
  - Taxi remains marked `Coming soon`.
  - Waitlist and driver readiness forms submit to public readiness endpoints.

## Security And Access

- Public endpoints accept readiness submissions only.
- Admin endpoints require authenticated admin access and admin-role guards.
- Vendor, rider and customer users cannot access admin Taxi readiness management.
- Driver application review and waitlist status updates are audit logged.
- No delivery OTPs, payment tokens, taxi fare data or live dispatch records are stored in Taxi readiness records.

## Launch Boundary

This architecture prepares data collection and review workflows. A future taxi launch requires separate product approval, legal/safety review, fare-control implementation, maps/location architecture, driver availability, dispatch rules, live ride lifecycle, payment review and operational playbooks.
