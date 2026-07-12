# Rider App UI Refinement Audit - Task 97

Date: 2026-07-13

Scope:

- `apps/rider-app`
- Taxi driver readiness validation DTO/types
- Rider staging QA checklist

## Summary

The Rider App was polished before the next staging APK build. This task did not activate
live payouts, rider wallet withdrawals, live Taxi booking, live payments, Pharmacy
marketplace or provider login.

## UI Refinements

- Added a Rider bottom navigation with `Home`, `Jobs`, `Earnings` and `Profile`.
- Tightened shared screen spacing so screens do not show large awkward top gaps.
- Dashboard now uses compact KariGO branding, rider greeting and an availability badge.
- Jobs screen title now reads `Assigned Jobs`.
- Job detail keeps the order reference visible and presents the current status clearly.
- Earnings screen now has a stronger total/pending/paid layout and live-withdrawal guardrail.
- Rider Profile now has a profile header, initials avatar, verification/availability badges,
  vehicle details, manual location update and rider tool links.

## Driver Application Validation

Taxi Driver Readiness remains readiness/test-mode only. Important verification and vehicle
fields are now required before submission:

- Full name
- Phone number
- City and state
- Residential address
- Driver licence number
- Licence expiry date
- Vehicle make
- Vehicle model
- Vehicle year
- Vehicle colour
- Vehicle plate number
- Vehicle type
- Vehicle ownership

The backend DTO now enforces these required fields as well. No Prisma schema or migration
change is required.

## Staging Guardrails

- Taxi live booking remains disabled unless staging flags are explicitly enabled.
- Taxi Test Mode copy still states no real ride, fare billing or payment is active.
- Rider earnings remain view-only; no live payout or withdrawal request is enabled.
- Rider delivery OTP remains customer-supplied and is not fetched/displayed by the Rider App.

## Manual QA Focus

- Confirm bottom navigation on Android after fresh APK install.
- Confirm dashboard spacing and branding.
- Confirm Rider Profile layout and logout.
- Confirm Earnings guardrail copy.
- Confirm Taxi readiness form blocks missing required verification/vehicle fields.
- Confirm submitted readiness applications still appear in Admin Taxi readiness review.
