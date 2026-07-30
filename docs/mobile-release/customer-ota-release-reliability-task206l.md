# Customer OTA Release Reliability - Task 206L

## Objective

Repair KariGO Customer OTA delivery reliability so JavaScript-only changes can reach the installed production app without repeatedly requiring a fresh AAB.

Current production identity:

- EAS project: `@zamkah/karigo-customer`
- EAS project ID: `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d`
- Android package: `com.karigo.customer`
- App version: `0.1.0`
- Android versionCode: `13`
- Runtime version: `0.1.0`
- Production channel: `customer-production`
- Production branch: `customer-production`
- Production API base: `https://karigo-8htn.onrender.com/api/v1`

## Root Cause

The installed versionCode 13 app is compatible with runtime `0.1.0` updates on `customer-production`, but OTA publishing was not consistently using the same production environment inputs as production builds.

Before this task:

- `apps/customer-app/eas.json` had production build env values.
- The EAS `production` environment only had the Android Google Maps key.
- OTA commands run without `--environment production` could evaluate `app.config.ts` with an empty API base and missing public feature flags.
- There was no in-app diagnostics surface to prove whether the running bundle was embedded or a downloaded OTA.
- An untracked repository-root `app.json` exists locally with an empty Expo object. It was not committed or removed in this task, but commands run from the repository root may resolve the wrong Expo project.

After this task:

- Production EAS Environment has the required public/non-secret Customer OTA values.
- `app.config.ts` has explicit owner, project ID, runtime and diagnostics metadata.
- The Customer API client supports both approved public API env aliases.
- The app has a Profile -> App diagnostics screen.
- The app has a safe startup update check gate.
- Production OTA commands must use `--channel customer-production --environment production --platform android`.

## Correct Working Directory

Run Customer EAS commands from:

```cmd
cd /d "C:\Users\zubai\OneDrive\Documents\KariGO\karigo-platform\apps\customer-app"
```

Do not run Customer EAS Update commands from the monorepo root unless the command explicitly supports selecting the Customer app project. A repository-root Expo config can cause project resolution mistakes.

## EAS Channel and Branch

Verified mapping:

- Channel: `customer-production`
- Linked branch: `customer-production`
- Latest pre-Task 206L update group before this task: `0aa0cd46-8467-4176-8355-34f7f5b07a5d`
- Runtime version: `0.1.0`
- Latest pre-Task 206L message: `Task 206J Rides search and route UX`

This means versionCode 13 can receive compatible OTA updates when they are published to `customer-production` with runtime `0.1.0`.

## Runtime Strategy

The Customer app now uses an explicit runtime:

```text
runtimeVersion = 0.1.0
```

This keeps JavaScript-only changes compatible with the currently installed production binary while avoiding accidental runtime drift from unrelated public app-version decisions.

Increment runtime version only when the native runtime changes.

## Environment Matrix

Required EAS production environment variable names:

- `APP_VARIANT`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_PAYMENT_LAUNCH_MODE`
- `EXPO_PUBLIC_RIDES_SERVICE_ENABLED`
- `EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED`
- `EXPO_PUBLIC_TAXI_SERVICE_ENABLED`
- `EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED`
- `EXPO_PUBLIC_RIDES_SERVICE_AREA_LABEL`
- `GOOGLE_MAPS_ANDROID_API_KEY`

Backend-only Render variable:

- `GOOGLE_MAPS_SERVER_API_KEY`

Never place the backend server key in EAS, Expo public variables, source control, docs, screenshots or mobile bundles.

## Release Classification

### OTA-Only

Use EAS Update for:

- Text and copy changes.
- React Native UI layout.
- Existing-component styling.
- JavaScript and TypeScript logic.
- API-client changes.
- Form validation.
- State-management changes.
- Screen/navigation changes using already-installed native modules.
- Business logic using existing native capabilities.

### Fresh AAB Required

Build a new AAB for:

- Adding or upgrading native dependencies.
- Android permission changes.
- Expo config plugin changes.
- Android manifest changes.
- Google Maps native API-key configuration changes.
- Package-name changes.
- SDK upgrades.
- Signing or credential changes.
- Native splash/icon/config changes where embedded native output changes.
- Any incompatible native runtime change.

When a fresh AAB is required:

- Increment Android `versionCode`.
- Update runtime version if the native runtime changes.
- Keep app version changes intentional and release-managed.

### Backend or Web Deployment Only

Use backend/web deployment only for:

- NestJS endpoints.
- Render environment changes.
- Prisma/database changes.
- Admin Portal changes.
- Vendor Dashboard changes.
- Backend Google Maps server proxy changes.

### Combined Deployments

Use backend redeploy plus Customer OTA when:

- The backend response contract changes and Customer JavaScript consumes it.
- A new backend endpoint is added for an existing app-native capability.
- Public config fields are changed and Customer UI logic depends on them.

## OTA-Only Release Procedure

Use:

```cmd
cd /d "C:\Users\zubai\OneDrive\Documents\KariGO\karigo-platform\apps\customer-app"
npx eas-cli project:info --non-interactive
npx eas-cli channel:view customer-production --non-interactive
npx eas-cli branch:view customer-production --non-interactive
npx eas-cli update --channel customer-production --environment production --platform android --message "Short release message" --non-interactive
```

Expected:

- Project: `@zamkah/karigo-customer`
- Project ID: `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d`
- Channel: `customer-production`
- Branch: `customer-production`
- Runtime: `0.1.0`

## Fresh AAB Procedure

Use only after confirming the change is native/runtime-affecting:

```cmd
cd /d "C:\Users\zubai\OneDrive\Documents\KariGO\karigo-platform\apps\customer-app"
npx eas-cli build --platform android --profile customer-production --non-interactive
```

Do not commit AAB/APK files, keystores, credentials or artifact URLs.

## Diagnostics Screen

Path:

```text
Profile -> App diagnostics
```

The screen safely shows:

- App version.
- Android versionCode.
- Runtime version.
- EAS channel.
- Update ID.
- Embedded vs downloaded OTA source.
- Update creation time.
- Production API hostname only.
- App environment.
- Update availability/download status.
- Last safe update-check result.
- Last safe update error.

Temporary marker:

```text
Task 206L OTA verification active
```

Remove this marker in the task after real-device verification.

## Manual Update Check

The diagnostics screen includes:

- `Check for app update`
- `Restart to apply downloaded update`
- `Refresh diagnostics`

The startup gate checks/downloads compatible updates but does not force reload during sensitive workflows.

Auto-update check skips:

- Checkout.
- Wallet.
- Utilities.
- KariGO Rides booking.
- Orders.
- Auth/onboarding.
- Vendor application.
- Captain application.

## Rollback

If an OTA causes a blocking issue:

1. Use EAS Update rollback/republish to point `customer-production` back to the last known good update.
2. Keep runtime `0.1.0` for compatible rollback.
3. Ask testers to force-close and reopen the app.
4. If a native issue is involved, build a fresh AAB with an incremented versionCode and appropriate runtime.

## Task 206L Verification OTA Record

Published verification OTA:

- EAS project: `@zamkah/karigo-customer`
- Channel: `customer-production`
- Branch: `customer-production`
- Runtime version: `0.1.0`
- Update group ID: `23d2525b-9439-4da1-bef9-96006c891ac4`
- Android update ID: `019fb2a7-b4de-7224-a0a4-fd1e44dcc3d4`
- Commit hash: `35ca3a45b108ef97e962959ec9acee769ce202f6`
- Publishing environment: `production`
- EAS CLI used: `20.5.1`
- Compatible with versionCode 13: Yes, JavaScript/config-only OTA

## Real-Device Checklist

1. Keep the existing versionCode 13 app installed.
2. Do not reinstall it.
3. Force-close the app.
4. Reopen with internet access.
5. Wait briefly for update checking.
6. Close and reopen again if needed.
7. Open Profile -> App diagnostics.
8. Confirm `Task 206L OTA verification active`.
9. Confirm source is `downloaded OTA`, not embedded.
10. Confirm update ID matches the Task 206L Android update ID.
11. Confirm runtime version is `0.1.0`.
12. Confirm channel is `customer-production`.
13. Confirm API host is `karigo-8htn.onrender.com`.
14. Test `Check for app update`.
15. Launch offline and confirm the app still opens using cached or embedded code.

Real-device acceptance remains pending until owner/tester evidence confirms the marker appears in the already-installed versionCode 13 app.
