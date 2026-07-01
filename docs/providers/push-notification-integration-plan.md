# Push Notification Integration Plan

## Current State

Push notifications are mock-only. The backend now has a provider registry, mock
provider, hard-disabled Expo and Firebase placeholders, operational template catalogue,
device-token persistence, and authenticated device-token endpoints. In-app
notifications remain the primary channel.

Task 35 strengthens token registration with authenticated role/app-surface matching,
Expo token-shape checks, and response omission of raw token/device identifiers. Both
mobile API clients now expose register/list/deactivate methods, but native permission and
token collection are not implemented. `MDR-014` remains open and no delivery was attempted.

Environment validation requires `PUSH_PROVIDER=mock`; selecting `expo` or `firebase`
fails startup until sandbox use is explicitly approved.

## Device Token Storage

`DeviceToken` supports multiple devices per user and records provider, platform, app
surface, optional device identifier, active state, and last-seen time. Raw token values
are accepted during registration but are not returned by list or deactivate responses.

Endpoints:

- `POST /api/v1/notifications/device-tokens`
- `GET /api/v1/notifications/device-tokens`
- `DELETE /api/v1/notifications/device-tokens/:token_id`

All routes require JWT authentication and only operate on the authenticated user's
tokens. A token already owned by another user cannot be claimed.

## Provider Preparation

- Mock: implemented; records safe masked-token logs only.
- Expo Push: hard placeholder; no HTTP request is implemented.
- Firebase Cloud Messaging: hard placeholder; no SDK/API request is implemented.

Recommended first sandbox path: Expo Push for the Expo customer and rider apps. Evaluate
direct FCM after permission, token refresh, invalid-token cleanup, and delivery receipt
handling are stable.

## Operational Use Cases

Customer: payment success, vendor acceptance, preparation/readiness, rider progress,
completion, refund approval, and support updates.

Rider: new job/reassignment, delivery reminders, earning-paid updates, and support
updates.

Vendor/admin web push remains future work. Use the existing in-app feed for these
surfaces.

## Required Environment Variables

`PUSH_PROVIDER`, `EXPO_ACCESS_TOKEN`, `FCM_SERVER_KEY`, `FCM_PROJECT_ID`,
`FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY`.

Never commit provider credentials. Keep `PUSH_PROVIDER=mock` until sandbox approval.

Task 35 activation records are in `push-sandbox-activation-readiness-check.md`,
`staging-push-provider-configuration.md`, `push-template-rendering-review.md`, and
`push-sandbox-activation-decision-log.md`.

## Testing Plan

1. Test permission granted, denied, and revoked states on physical devices.
2. Register and refresh tokens after login and app start.
3. Deactivate the current device token on logout.
4. Test multiple devices per user and cross-user ownership protection.
5. Test foreground, background, and terminated app delivery.
6. Process invalid-token provider receipts by deactivating affected tokens.
7. Verify provider outages never break order/payment/support workflows.
8. Confirm payloads contain no sensitive customer or financial data.

## Production Go-Live Checklist

- User permission UX approved.
- Expo/FCM sandbox delivery and receipt handling tested.
- Token refresh and logout cleanup implemented in both mobile apps.
- Invalid-token deactivation worker/process implemented.
- Deep-link routes reviewed and access-controlled.
- Notification preferences and quiet-hours decision approved.
- Provider credentials stored in a managed secret store.
- Monitoring, rate controls, and incident response ready.
