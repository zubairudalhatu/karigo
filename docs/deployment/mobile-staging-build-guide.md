# Mobile Staging Build Guide

This guide prepares private KariGO Customer and Rider staging builds for approved
internal testers only. Do not use these builds for public distribution, app-store
submission, live payment testing, or real-customer traffic.

## Staging API

Both mobile apps must use:

```text
EXPO_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1
```

The value is injected by the EAS staging profiles and can also be set locally through the
app `.env` files. Do not commit local `.env` files.

## Required Access

- Approved Expo/EAS account access.
- Access to the KariGO Expo organization/project if one has been created.
- Approved internal Android test devices.
- Secure handover channel for staging demo credentials.
- GitHub access to the current `main` branch.

Authenticate securely:

```bash
npx eas-cli login
npx eas-cli whoami
```

Do not store Expo tokens in Git, screenshots, or documentation.

## App Identities

| App | Staging name | Android package | iOS bundle identifier |
| --- | --- | --- | --- |
| Customer App | KariGO Customer Staging | `com.karigo.customer.staging` | `com.karigo.customer.staging` |
| Rider App | KariGO Rider Staging | `com.karigo.rider.staging` | `com.karigo.rider.staging` |

The staging identifiers are intentionally distinct from future production app IDs.

## EAS Profiles

Root `eas.json` defines:

- `customer-staging`
- `rider-staging`
- `customer-staging-ios-simulator`
- `rider-staging-ios-simulator`

Android staging builds are internal APK builds.

## Customer App Android Internal Build

From the repository root:

```bash
npx eas-cli build --platform android --profile customer-staging --project-dir apps/customer-app
```

If the installed EAS CLI does not support `--project-dir`, run from the app directory and
copy or symlink the root `eas.json` into the app directory for the build session only:

```bash
cd apps/customer-app
npx eas-cli build --platform android --profile customer-staging
```

## Rider App Android Internal Build

From the repository root:

```bash
npx eas-cli build --platform android --profile rider-staging --project-dir apps/rider-app
```

Fallback if `--project-dir` is unavailable:

```bash
cd apps/rider-app
npx eas-cli build --platform android --profile rider-staging
```

## Optional iOS Simulator Builds

Only run these when iOS testing is approved and Expo project credentials are ready:

```bash
npx eas-cli build --platform ios --profile customer-staging-ios-simulator --project-dir apps/customer-app
npx eas-cli build --platform ios --profile rider-staging-ios-simulator --project-dir apps/rider-app
```

## Install On Internal Android Devices

1. Wait for the EAS internal APK build to finish.
2. Share the EAS install link only with approved internal testers.
3. Install on approved devices.
4. Do not post APK links publicly.
5. Do not test with real customer data.

## Verify Staging Connection

On each installed app:

1. Open the app and confirm the staging app name appears on the device launcher/install
   prompt.
2. Confirm logo/splash loads.
3. Log in with the approved staging demo account.
4. Confirm API data loads from the Render staging backend.
5. Confirm failed network/API requests show friendly messages.
6. Confirm no live provider flow is triggered.

## Updating The Staging API URL

1. Update `EXPO_PUBLIC_API_BASE_URL` in the EAS profile or app local `.env`.
2. Rebuild the app. Expo public env values are bundled at build time.
3. Reinstall the new internal build on test devices.

## Troubleshooting

- Blank data: verify the API URL and Render health endpoint.
- Login fails: verify the staging demo credential reset and account role.
- CORS is not usually the issue for native mobile apps, but backend network/firewall
  availability still matters.
- Render cold start: wait and retry once the backend wakes up.
- Wrong app name/package: confirm `APP_VARIANT=staging` is present in the EAS profile.
- Provider errors: confirm mock providers remain active.
