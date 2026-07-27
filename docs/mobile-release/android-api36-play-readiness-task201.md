# Android API 36 Play Readiness - Task 201

Date: 2026-07-27

## Purpose

Prepare KariGO mobile apps for Google Play's Android 16 / API 36 target requirement while keeping package names, app names, API base URLs and launch guardrails stable.

## Google Play Requirement

Google Play Console currently warns that app updates must target Android 16 / API 36 or higher before the August 31, 2026 enforcement date.

Official references:

- Google Play target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Android developer migration guide: https://developer.android.com/google/play/requirements/target-sdk
- Expo build-properties plugin: https://docs.expo.dev/versions/latest/sdk/build-properties/

Task 201 configures the Expo managed apps with `expo-build-properties`:

```json
{
  "android": {
    "compileSdkVersion": 36,
    "targetSdkVersion": 36,
    "buildToolsVersion": "36.0.0"
  }
}
```

## App Configuration Review

| App | Path | Package | App name | Production profile | Production channel | Previous versionCode | Task 201 versionCode | Target API |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| Customer | `apps/customer-app` | `com.karigo.customer` | KariGO | `customer-production` | `customer-production` | 9 | 10 | 36 |
| Partner | `apps/partner-app` | `com.karigo.partner` | KariGO Partner | `partner-production` | `partner-production` | 1 | 2 | 36 |
| Captain | `apps/rider-app` | `com.karigo.rider` | KariGO Captain | `captain-production` | `captain-production` | 6 | 7 | 36 |

## Production API Base

All production EAS profiles continue to use:

```text
https://karigo-8htn.onrender.com/api/v1
```

## Scope Confirmation

Changed:

- Mobile app Expo config only.
- Mobile package dependencies for `expo-build-properties`.
- Mobile regression checks.
- Play-readiness documentation.

Not changed:

- Backend logic.
- Admin Portal.
- Vendor Dashboard.
- Website.
- Prisma schema or migrations.
- Payment provider activation.
- Live ride dispatch or payout automation.

## Build Notes

Fresh Android AABs are required before Google Play can reflect API 36:

- Customer AAB: required before the next Customer Play upload because target SDK and versionCode changed.
- Partner AAB: required for first Play Internal Testing upload and because Task 200 added native upload modules.
- Captain AAB: required before the next Captain Play upload because target SDK and versionCode changed.

Do not commit AAB/APK files or direct artifact URLs.

## Expo SDK Compatibility Note

The apps remain on Expo SDK 53 in this task. API 36 is configured through `expo-build-properties` to keep this change narrow.

If EAS build fails because the SDK 53 build image does not support API 36 cleanly, the next approved task should migrate the mobile apps to Expo SDK 54 or newer, where Expo's SDK support table lists Android compile/target SDK 36 as the baseline.

## Internal Testing Upload Guardrails

Before uploading each AAB:

1. Confirm package name matches the Play Console app.
2. Confirm versionCode has not already been uploaded.
3. Confirm target SDK is 36 in the generated bundle.
4. Upload to Google Play Internal Testing only.
5. Do not publish to production.
6. Stop if Play reports signing key mismatch, reused versionCode, package mismatch or target API failure.

Production publishing remains not approved.
