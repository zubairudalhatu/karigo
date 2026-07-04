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

## Local Node And CLI Guidance

Use Node `22.x` for local Expo/EAS staging builds. The repository pins Node 22 because
newer non-LTS Node releases can make Expo/EAS config resolution behave inconsistently on
Windows.

Check before building:

```bash
node --version
```

If Expo config validation appears to pause while using `npx`, run the local workspace
binary without allowing package installation:

```bash
npx --no-install expo config --type public
```

That command should be run from the app directory after setting the staging environment
variables for local validation.

Do not add `eas-cli` to either mobile app's dependencies or dev dependencies. Keep EAS
CLI as a shell tool through `npx eas-cli ...` or an approved global installation so it
does not affect Expo SDK package resolution inside the app.

For Expo SDK 53 Android builds, Expo Router peer packages are declared explicitly in the
mobile app manifests. This keeps `expo-constants`, `expo-linking`, and
`react-native-screens` aligned with the SDK-compatible versions used by Expo prebuild.

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

Each Expo app has its own EAS configuration. Do not rely on a root `eas.json` for app
builds.

- Customer: `apps/customer-app/eas.json`
- Rider: `apps/rider-app/eas.json`

Android staging builds use internal distribution and APK output for direct installation
on approved Android test devices.

## Customer App Android Internal Build

Run from the Customer App directory:

```bash
cd apps/customer-app
npx eas-cli build --platform android --profile customer-staging
```

Local Customer App config validation:

```bash
cd apps/customer-app
APP_VARIANT=staging EXPO_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1 npx --no-install expo config --type public
```

PowerShell equivalent:

```powershell
cd apps/customer-app
$env:APP_VARIANT = "staging"
$env:EXPO_PUBLIC_API_BASE_URL = "https://karigo-8htn.onrender.com/api/v1"
npx --no-install expo config --type public
npx eas-cli --version
```

## Rider App Android Internal Build

Run from the Rider App directory:

```bash
cd apps/rider-app
npx eas-cli build --platform android --profile rider-staging
```

PowerShell equivalent:

```powershell
cd apps/rider-app
$env:APP_VARIANT = "staging"
$env:EXPO_PUBLIC_API_BASE_URL = "https://karigo-8htn.onrender.com/api/v1"
npx eas-cli build --platform android --profile rider-staging
```

See `docs/deployment/rider-app-staging-build-guide.md` for Rider-specific validation,
post-install testing, and first-time EAS project linking notes.

## Optional iOS Simulator Builds

Only run these when iOS testing is approved and Expo project credentials are ready:

```bash
cd apps/customer-app
npx eas-cli build --platform ios --profile customer-staging-ios-simulator

cd ../rider-app
npx eas-cli build --platform ios --profile rider-staging-ios-simulator
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
