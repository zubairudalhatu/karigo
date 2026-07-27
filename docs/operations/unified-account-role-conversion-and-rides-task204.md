# Task 204 Operations Note: Unified Account Role Conversion and KariGO Rides

Date: 2026-07-27

## Purpose

Task 204 keeps KariGO on a central account model while allowing the same customer account to continue into Partner and Captain onboarding.

The implementation does not convert the database to a multi-role array. Instead, it keeps the existing `User.role` as a legacy/base account marker and derives operational access from linked records:

- Customer access: central `User` plus customer profile/session.
- Partner access: linked Partner/Vendor application or approved Partner profile.
- Captain access: linked Delivery Captain or Ride Captain readiness application/profile.

This preserves existing data and avoids risky role/database migration during launch preparation.

## Account Conversion Rules

- Existing customer accounts can sign into Partner App and KariGO Captain App with the same phone/password.
- Partner App checks Partner onboarding/profile state after login.
- Captain App checks Delivery Captain and Ride Captain readiness/application state after login.
- Applicant creation should not create another `User` when the phone already belongs to an active customer account.
- Phone numbers are normalized before auth/application matching so local Nigerian and international formats map to the same canonical account.
- Duplicate active Partner/Captain applications remain blocked.

## Partner App States

Partner App should show one of these safe states:

- `application_not_started`
- `application_in_progress`
- `application_submitted`
- `correction_required`
- `approved`
- `rejected`
- `restricted`

The app should not show a generic “account cannot use Partner app” message for a normal existing customer account.

## Captain App States

KariGO Captain App should allow the same existing account to reach a useful dashboard state:

- Delivery Captain application/status when present.
- Ride Captain readiness application/status when present.
- Clear onboarding prompt when a Captain application is not yet started.

Ride Captain remains readiness/manual review only.

## KariGO Rides Booking Flow

The Customer App Rides flow is now structured as:

1. Rides home
2. Pickup and destination selection
3. Saved/recent/manual places
4. Current-location pickup helper
5. Route preview summary
6. Backend fare estimate
7. Ride category selection
8. Payment/schedule/pickup instruction review
9. Controlled-pilot request creation
10. Tracking/status screen

The Customer App hides normal marketplace bottom navigation during ride booking so the booking flow feels focused.

## Safety Guardrails

- No live ride dispatch was activated.
- No automatic matching was activated.
- No ride payment capture was activated.
- No Captain payout automation was activated.
- Ride requests remain manual Operations/Admin assignment.
- Backend remains final authority for fare estimate and trip creation.

## Deployment Notes

- Backend redeploy is required for account-state endpoint changes, Partner route authorization compatibility, phone normalization, and Rides category/fare estimate support.
- Customer EAS Update is required for the Rides booking UI and bottom-navigation behavior.
- Partner EAS Update is required for existing-customer Partner login/onboarding state handling.
- Captain EAS Update is required for existing-customer Captain dashboard/onboarding state handling.
- Prisma migration is not required.
- Fresh AABs are required only if the current Play/Internal Testing binaries do not apply OTA updates reliably.

## Post-Deployment Smoke Checks

1. Login as an existing customer in Customer App.
2. Login with the same account in Partner App.
3. Confirm Partner App shows recognised/onboarding status instead of rejecting the account.
4. Continue Partner onboarding and confirm no duplicate account is created.
5. Login with the same account in KariGO Captain App.
6. Confirm Delivery Captain and/or Ride Captain state appears where applicable.
7. Open Customer App KariGO Rides.
8. Select pickup/destination.
9. Confirm backend fare estimate and ride categories load.
10. Submit a controlled-pilot ride request.
11. Confirm Admin/Operations can see the request for manual assignment.

## Rollback Plan

If post-deployment Partner/Captain access has unexpected behavior:

1. Roll back mobile OTA updates for Partner/Captain first.
2. If backend authorization causes regressions, redeploy the previous backend commit.
3. Verify Customer App auth and existing Vendor Dashboard access.
4. Keep any submitted Partner/Captain applications; do not delete live records as part of rollback.
