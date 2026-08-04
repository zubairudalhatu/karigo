# Android technical compliance

## Configured baseline

All three apps use Expo SDK 53 / React Native 0.79, `compileSdkVersion 36`, `targetSdkVersion 36`, build tools 36.0.0, AAB output, local version sources and remote production signing credentials. Production package names and API base are fixed in app/EAS config.

## Required generated-artifact checks

For each final AAB:

1. Dump the base manifest with Bundletool and archive the permission inventory in the app permissions document.
2. Confirm the package is the production package and the main activity is exported only as required for launcher/deep links.
3. Confirm `android:usesCleartextTraffic` is absent or false and no development network security override is packaged.
4. Confirm no background-location, SMS, call-log, contacts, broad storage or package-install permission is present.
5. Confirm 64-bit `arm64-v8a` native libraries are packaged.
6. Run `bundletool dump config --bundle <aab>` and require 16 KB page alignment support. Inspect every packaged `.so`; list any library that cannot be verified.
7. Record signing certificate SHA-1 from the AAB without exposing the keystore.

The build is not technically approved until these generated-AAB checks pass. A source-level Expo configuration check alone is insufficient.

## Native capabilities expected

| Capability | Customer | Captain | Partner |
| --- | --- | --- | --- |
| Foreground location | Address and ride map selection | Operational map and work coordination | No |
| Background location | No | No | No |
| Maps SDK | Yes | Yes | No |
| Photos | User-selected profile image | User-selected application/profile evidence | Product, business and document uploads |
| Documents | No broad storage access | User-selected application documents | User-selected onboarding documents |
| Biometrics | Local sign-in convenience | Local sign-in convenience | Not currently configured |
| Notifications | Runtime notification support where enabled | Assignment/operational notifications where enabled | Order/business notifications where enabled |

## Build gate

- `APP_VARIANT=production`.
- API is `https://karigo-8htn.onrender.com/api/v1`.
- Customer and Captain production Maps key names exist in EAS; values are never printed.
- No development client, staging package or staging channel.
- `android.permission.RECORD_AUDIO` and `android.permission.SYSTEM_ALERT_WINDOW` are explicitly blocked for all apps. Customer and Partner also block camera/write-storage because they only choose existing files.
- Android app-data backup is disabled for all three production apps.
- No OTA is published to a runtime older than 1.0.0.
