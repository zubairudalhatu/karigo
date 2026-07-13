# Captain App Role Mode Readiness - Task 98

Date: 2026-07-13

## Summary

The existing KariGO Rider App has been repositioned as the KariGO Captain App for
staging builds. Internal package names, EAS project linkage and backend rider endpoints
remain unchanged so the existing Expo project and staging API continue to work.

## Captain Modes

| Mode | Current status | Allowed actions | Guardrails |
| --- | --- | --- | --- |
| Delivery Captain | Active for approved Captain accounts | Delivery assignments, pickup/delivery milestones, customer OTP completion, earnings visibility | Delivery jobs only; no payout or withdrawal action |
| Ride Captain | Readiness/test-gated only | Ride/vehicle readiness application and staging-only test mode when flags are enabled | No live ride booking, ride dispatch, fare billing, payment or public matching |

## Branding Changes

- App display name now uses `KariGO Captain` / `KariGO Captain Staging`.
- Welcome and login screens use Captain-facing language.
- Dashboard and profile show Captain modes.
- Ride readiness is now the customer-facing label for future KariGO Rides preparation.

## Operational Notes

- Backend auth still uses the existing `RIDER` role until a future backend Captain role
  model is approved.
- Delivery Captain mode is mapped to the existing approved Captain profile.
- Ride Captain mode is not live. It remains controlled by ride staging flags and captain
  readiness/profile review.
- No live ride booking, ride dispatch, payouts, withdrawals, payments, Pharmacy marketplace
  or provider login were activated.
