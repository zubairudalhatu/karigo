# Captain And Ride Copy Cleanup - Task 99

Date: 2026-07-13

## Summary

Task 99 updates public and operations-facing wording after the Captain App rename.
This is a display/copy and UI polish pass only. Internal package names, API routes,
database models and enum names remain unchanged for safety.

## Language Standard Applied

- `KariGO Captain`
- `Delivery Captain`
- `Ride Captain`
- `KariGO Rides`
- `Ride readiness`
- `Ride application`
- `Ride operations`

## Surfaces Updated

- Captain App welcome, dashboard, profile, bottom navigation and ride-readiness copy.
- Website service catalogue, services page, homepage, Captains page, contact, privacy,
  terms and ride-readiness forms.
- Admin Portal navigation, dashboard metrics, dispatch assignment, order detail dispatch,
  settlements, reports and Ride Operations page.

## Guardrails Preserved

- No live ride booking or live ride dispatch was activated.
- No payout, withdrawal, payment, Pharmacy marketplace or provider-login feature was activated.
- Existing `rider`, `taxi`, `RIDER` and EAS/package identifiers remain internal compatibility
  names only.
