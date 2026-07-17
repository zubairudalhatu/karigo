# Task 154 - Captain Version Code Rebuild Record

Date: 2026-07-17

## Purpose

Record the KariGO Captain Android release-candidate rebuild after Google Play rejected the previous AAB because Android `versionCode` `1` had already been used for package `com.karigo.rider`.

This task updates the Captain Android version code only, rebuilds the Captain production AAB, and prepares the artifact for Google Play internal or closed testing. It does not rebuild the Customer App, publish to production, activate live payments or activate live ride-hailing.

## Failed Upload Reason

```text
Google Play error: Version code 1 has already been used. Try another version code.
Package: com.karigo.rider
Affected build: 79123804-7a58-45ad-807e-d9d87dffea1f
```

## Version Code Change

| App | Package | Previous versionCode | New versionCode | Config file |
| --- | --- | --- | --- | --- |
| KariGO Captain App | `com.karigo.rider` | `1` | `2` | `apps/rider-app/app.config.ts` |

The Captain package name, app name, EAS project ID, production profile and API base URL remain unchanged.

## Optional Customer App Check

Customer App was inspected for Android `versionCode` configuration. It does not currently declare a version code in `apps/customer-app/app.config.ts` or `apps/customer-app/app.json`, so it likely relies on the Expo/Android default unless configured elsewhere. Customer App was not changed because this task addresses the Captain Google Play rejection only.

## Build Command Executed

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Build Result

| App | EAS project | EAS build ID | Profile | Package | versionCode | Artifact | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KariGO Captain App | `@zamkah/karigo-rider` | `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` | `captain-production` | `com.karigo.rider` | `2` | Android App Bundle (`.aab`) | Passed |

Direct artifact download URLs are intentionally not committed to Git. Release operators should retrieve the AAB from the authenticated Expo dashboard/build page or approved private release storage.

## Build Configuration Confirmed

```text
Name: KariGO Captain
Slug: karigo-rider
Package: com.karigo.rider
Android versionCode: 2
EAS project ID: 344a78dc-69d9-4daa-9616-f100b67f0910
Profile: captain-production
Channel: captain-production
API base URL: https://karigo-8htn.onrender.com/api/v1
Artifact type: Android App Bundle
```

## Safety Guardrails

- Customer App was not rebuilt or changed.
- Backend, Admin Portal, Vendor Dashboard and Website were not changed.
- Production publishing was not performed.
- Live payments remain disabled.
- Live ride-hailing and ride dispatch remain disabled.
- No `.env` files, secrets, AAB/APK files or direct artifact URLs were committed.

## Current Decision

```text
Captain versionCode bump: Completed
Captain Android AAB rebuild: Passed
Google Play internal/closed testing upload: Ready for operator retry
Production publishing: Not approved
Live payment activation: Not approved
```
