# Captain 1.1 native dispatch release readiness

Task: `209B-S1-H7A`

This record prepares the native Captain release required by H7. It does not authorize an AAB build, Play submission, or OTA publication.

## Release identity

| Setting | Captain 1.1 value |
| --- | --- |
| App version | `1.1.0` |
| Android versionCode | `15` |
| Runtime | `1.1.0` through the `appVersion` runtime policy |
| Android package | `com.karigo.rider` |
| Expo slug | `karigo-rider` |
| EAS project | `344a78dc-69d9-4daa-9616-f100b67f0910` |
| Build profile | `captain-production` |
| Update channel | `captain-production` |
| API | `https://karigo-8htn.onrender.com/api/v1` |

Runtime `1.0.0` remains the boundary for old Captain binaries. H7 JavaScript must not be published to that runtime. Future Captain 1.1 OTA updates, if separately approved, must target runtime `1.1.0` on `captain-production`.

## Firebase and notification configuration

- `apps/rider-app/google-services.json` is the Firebase Android client configuration for `com.karigo.rider`.
- Production Expo config points `android.googleServicesFile` to `./google-services.json`.
- The staging package does not consume the production Firebase client configuration.
- The private Firebase Admin SDK/service-account key remains outside Git and is protected by a repository ignore rule.
- FCM V1 service-account credentials are owner-managed in EAS, not in the application bundle or repository.
- Expo notifications request Android notification permission, use the `captain-assignments` channel, register the Expo token with the KariGO backend, and refresh assignment state from backend authority.

## Android permission and service scope

The generated Android configuration contains the permissions required for controlled real-time dispatch:

- `android.permission.POST_NOTIFICATIONS` through the Expo Notifications native manifest.
- `android.permission.ACCESS_COARSE_LOCATION`.
- `android.permission.ACCESS_FINE_LOCATION`.
- `android.permission.ACCESS_BACKGROUND_LOCATION`.
- `android.permission.FOREGROUND_SERVICE`.
- `android.permission.FOREGROUND_SERVICE_LOCATION`.

Expo Location contributes a non-exported `LocationTaskService` with `foregroundServiceType="location"`. Background tracking is started only while active work exists, uses the H7 movement/time thresholds, and is stopped when active work ends. Push notification delivery remains primary; background JavaScript polling is not used.

## Maps and launcher assets

- The Google Maps Android key remains supplied through the approved EAS/environment secret and is not stored in this record.
- Generated Android metadata continues to reference `com.google.android.geo.API_KEY`.
- The fallback icon, adaptive foreground, monochrome icon, Play icon, and native launcher override remain unchanged.
- The native override continues to replace the ten density-specific legacy launcher and round-launcher resources with the approved assets.

## Google Play owner actions

Before promoting the new AAB beyond controlled internal testing, the Play Console owner must:

1. Open **Policy and programs > App content > Sensitive app permissions > Location permissions** and complete or update the background-location declaration for the Captain active-work tracking feature.
2. Provide a short reviewer video showing the prominent disclosure, permission flow, Captain accepting active work, the persistent foreground-service notification, background tracking during that work, and tracking stopping when work ends.
3. Ensure the public privacy policy and Play listing clearly explain active-work background location and why it is core to Captain dispatch/navigation.
4. Complete the Android 14+ foreground-service declaration for the `location` service type, including the feature description, impact if delayed/interrupted, and demonstration video.
5. Review **Data safety** and **App content** so precise/background location collection, purpose, processing, retention, sharing, security, and deletion statements match production behaviour.
6. Confirm Play reviewers can reach the feature using controlled review access and instructions without exposing production customer data.

Policy references:

- https://support.google.com/googleplay/android-developer/answer/9799150
- https://support.google.com/googleplay/android-developer/answer/13392821
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://developer.android.com/develop/background-work/services/fgs/service-types

No Play Console changes are performed by this task.

## Approved build command

Run from `apps/rider-app` only after explicit build approval:

```powershell
npx eas-cli build --platform android --profile captain-production --non-interactive
```

Do not publish an OTA and do not submit the AAB automatically as part of H7A.
