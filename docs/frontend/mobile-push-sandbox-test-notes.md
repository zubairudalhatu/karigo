# Mobile Push Sandbox Test Notes

## Customer App Status

- Authenticated register/list/deactivate device-token API methods are available.
- `expo-notifications` and project-specific push configuration are not installed.
- Permission prompt, Expo token collection, refresh, foreground/background handlers, and
  logout deactivation are not implemented.

## Rider App Status

- Authenticated register/list/deactivate device-token API methods are available.
- The same native permission and Expo configuration gaps apply.

## Approved Future Permission Flow

1. Explain the operational benefit after login.
2. Request OS permission without blocking app use if denied.
3. Collect an Expo token only from an approved staging build/device.
4. Register with the authenticated user's correct app surface.
5. Refresh registration on login, app start, and token rotation.
6. Deactivate the current registration during logout or device removal.

Permission denial must leave in-app notifications fully available and show neutral settings
guidance without repeated prompts.

## Runtime Behavior To Test

- Foreground: restrained in-app banner and authenticated data refresh
- Background/terminated: OS notification tray
- Tap: open the app only; authenticated order/job/ticket deep links remain future work
- Token rotation: register replacement, then deactivate stale registration
- Invalid receipt: backend cleanup remains a required adapter feature

## Known Limitations

- No native push SDK or physical-device build configuration
- No automatic logout cleanup because the apps do not yet retain the backend token-record ID
- No receipt worker, invalid-token cleanup, deep links, preferences, or quiet hours
- No live/sandbox delivery evidence

With `PUSH_PROVIDER=mock`, requests are accepted and token values are masked in logs, but
mock acceptance is not proof of device delivery.
