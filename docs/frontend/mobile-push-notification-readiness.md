# Mobile Push Notification Readiness

## Current State

Customer and rider apps continue using the in-app activity feed. No real push provider
SDK, device permission prompt, or real delivery is enabled. The backend now provides
authenticated device-token registration, listing, and deactivation endpoints.

Both mobile API clients now expose those endpoint methods. Native permission prompts,
Expo token collection/refresh, foreground/background handlers, and logout cleanup remain
unimplemented because `expo-notifications`, approved project configuration, credentials,
and physical test devices are not available. See `mobile-push-sandbox-test-notes.md`.

## Customer And Rider Permission Flow

1. Explain the operational value before showing the operating-system permission prompt.
2. Ask only after login or at a relevant moment, not immediately on first launch.
3. App use must continue when permission is denied.
4. Store the user's preference and provide a future settings link.
5. Never treat push permission as marketing consent.

## Token Lifecycle

After permission:

1. Collect an Expo token first during the initial sandbox phase.
2. Register it with `POST /api/v1/notifications/device-tokens`.
3. Refresh registration on app start, login, token rotation, and relevant device change.
4. Deactivate the current token with `DELETE /api/v1/notifications/device-tokens/:id`
   during logout.
5. Keep multiple active devices per user.

Registration fields are `token`, `platform`, `provider`, `appSurface`, and optional
`deviceId`. Token values must be kept out of app logs and analytics.

## Foreground And Background Behaviour

- Foreground: show a restrained in-app banner and refresh relevant cached data.
- Background/terminated: use the operating-system notification tray.
- Deep links are future work; every deep-linked destination must re-check authentication
  and ownership through the backend.
- Silent/background tracking notifications are not approved.

## Future Work

- Add Expo Notifications dependencies and physical-device sandbox configuration.
- Add Firebase/APNs setup only after the Expo pilot decision.
- Handle token refresh, invalid-token receipts, and permission revocation.
- Add user notification preferences and optional quiet hours.
- Define safe deep links for orders, jobs, tickets, and notifications.
