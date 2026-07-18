# Task 168 - Fresh Customer and Captain Build Requirement

## Summary

Task 168 changes require fresh mobile release validation before the next Play internal-testing rollout.

## Customer App

Customer App changes include:

- OTP recovery login routing for registered but unverified customers.
- saved-address GPS capture.
- Privacy and Security profile screen.
- wallet/referral copy updates.
- live-ready service copy cleanup.

These are mostly JavaScript/config-safe changes, but the installed app reported stale Wallet copy after prior EAS Update and storage clear. Treat the next Customer distribution as requiring a fresh internal-testing build or a carefully verified EAS Update plus install test.

## Captain App

Captain App changes include:

- `expo-location` dependency and config plugin.
- foreground GPS permission copy.
- live location update behavior when going online.
- Captain application document metadata fields.
- Ride review copy cleanup.

Because `expo-location` is a native dependency/config plugin, Captain requires a fresh AAB/APK build for Play internal testing.

## Build Guardrails

- Do not publish to production from this task.
- Do not commit APK/AAB artifacts.
- Do not commit artifact URLs.
- Do not change package names.
- Validate Expo config before building.

## Recommended Next Mobile Action

After backend/web redeploys pass, build and verify:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```
