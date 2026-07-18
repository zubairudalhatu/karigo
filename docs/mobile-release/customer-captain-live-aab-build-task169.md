# Task 169 - Customer and Captain Live AAB Build Record

Date: 18 July 2026

Source commit before build:

```text
7b3c754 feat: add live onboarding otp recovery and location readiness
```

This record covers fresh Android production release-candidate AAB builds for Google Play internal testing. It does not approve production publishing.

## Deployment Requirements Confirmed

| Item | Required | Notes |
| --- | --- | --- |
| Backend redeploy | Yes | Required for Task 168 backend OTP, activation, GPS guard and ride pricing changes. |
| Prisma migration | No | Task 168 did not add schema changes. |
| Website redeploy | Yes | Required for live Kano/Abuja onboarding copy and application form updates. |
| Admin Portal redeploy | Yes | Required for activation-link send behavior and ride pricing visibility. |
| Vendor Dashboard redeploy | Yes | Required for activation resend UX and session handling. |
| Customer EAS Update | Yes | Useful for compatible installs, but fresh AAB is required for release-candidate distribution. |
| Captain EAS Update | Yes | Useful for compatible installs, but fresh AAB is required because `expo-location` was added. |
| Fresh Customer AAB | Yes | Required for Google Play internal testing closeout. |
| Fresh Captain AAB | Yes | Required for Google Play internal testing closeout and native location permission support. |
| Production publishing | No | Google Play production release is not approved in this task. |

## Version Codes

| App | Package | Previous target | New versionCode | App name | Result |
| --- | --- | ---: | ---: | --- | --- |
| Customer App | `com.karigo.customer` | `2` | `3` | `KariGO` | Bumped |
| KariGO Captain App | `com.karigo.rider` | `3` | `4` | `KariGO Captain` | Bumped |

Package names and app names were not changed.

## Production Expo Config Confirmation

| App | Profile | Channel | API base URL | Icon/adaptive icon | Native notes |
| --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `customer-production` | `https://karigo-8htn.onrender.com/api/v1` | Full KariGO logo on white background | Includes `expo-location` for address detection. |
| KariGO Captain App | `captain-production` | `captain-production` | `https://karigo-8htn.onrender.com/api/v1` | Full KariGO logo on white background | Includes `expo-location` for online/on-delivery location updates. |

## Build Results

| App | EAS project | Profile | Build ID | VersionCode | Artifact type | Build status |
| --- | --- | --- | --- | ---: | --- | --- |
| Customer App | `@zamkah/karigo-customer` | `customer-production` | `3b6780cb-696e-4bdf-9b4a-d6035ae88a8c` | `3` | Android App Bundle (`.aab`) | Finished |
| KariGO Captain App | `@zamkah/karigo-rider` | `captain-production` | `07683e2e-5f5e-4c16-8f7e-66b746cfbfb5` | `4` | Android App Bundle (`.aab`) | Finished |

Direct Expo artifact URLs are intentionally not recorded in Git. Retrieve artifacts from the Expo dashboard using the build IDs above.

## Commands Used

Customer:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

Captain:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Upload Status

| App | Google Play internal-testing upload performed by Codex | Production publishing performed |
| --- | --- | --- |
| Customer App | No | No |
| KariGO Captain App | No | No |

The operator should upload the AAB artifacts manually to Google Play internal testing and stop if any package, versionCode or signing-key mismatch is reported.
