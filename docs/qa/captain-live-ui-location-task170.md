# Task 170 Captain Live UI and Location Verification

## Scope

This record covers KariGO Captain UI cleanup, biometric sign-in, legal pages and live location update behaviour.

## Expected Behaviour

- Captain dashboard uses a light, clean top card and one visible availability status chip.
- Dashboard shows a single Ride review entry point.
- Ride wording stays truthful: KariGO Rides is not active yet.
- Profile includes biometric sign-in controls and in-app Privacy/Terms links.
- Captain GPS update requests foreground location permission.
- Offline location updates show: `Go online before updating live location.`
- Backend receives latest location only when Captain is online or otherwise allowed by the flow.

## Manual QA

1. Sign in to KariGO Captain.
2. Confirm dashboard has one status chip and no duplicated online/offline labels.
3. Confirm only one `Apply for Ride review` entry appears.
4. Go offline, open Profile and tap `Use device GPS now`.
5. Confirm the app shows `Go online before updating live location.`
6. Go online from dashboard and approve foreground location permission.
7. Confirm location update succeeds and profile coordinates refresh.
8. Open Profile Privacy Policy and Terms.
9. Enable biometric sign-in and confirm it refreshes only a saved backend session.

## Guardrails

- Do not activate live rides, ride dispatch, payouts or withdrawals.
- Do not record live coordinates in public docs or screenshots.
- Biometric sign-in must fail if the saved backend refresh token is missing or revoked.
