# Android technical compliance

## Configured baseline

All three apps use Expo SDK 53 / React Native 0.79, `compileSdkVersion 36`, `targetSdkVersion 36`, build tools 36.0.0, AAB output, local version sources and remote production signing credentials. Production package names and API base are fixed in app/EAS config.

## Final generated-artifact result

All three final AABs passed the generated-artifact audit:

- Production packages, version 1.0.0 and final version codes match the release record.
- Merged manifests report compile/target SDK 36 and minimum SDK 24.
- `android:allowBackup=false`; no custom cleartext or development network-security override is packaged. Android's secure default applies.
- No background-location, overlay, microphone, SMS, call-log, contacts or package-install permission is declared.
- Every app packages 16 libraries for each of `arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`.
- Every 64-bit `arm64-v8a` and `x86_64` ELF load segment has minimum alignment 16,384 bytes; no unsupported 64-bit library was found.
- Bundletool config declares `PAGE_ALIGNMENT_16K` for uncompressed native libraries.
- Signing certificate fingerprints are recorded without keystores or credentials.

The 32-bit compatibility libraries retain 4 KB ELF alignment. The Android 16 KB page-size requirement applies to 64-bit processes, and both packaged 64-bit ABIs passed.

## Native capabilities expected

| Capability | Customer | Captain | Partner |
| --- | --- | --- | --- |
| Foreground location | Address and ride map selection | Operational map and work coordination | No |
| Background location | No | No | No |
| Maps SDK | Yes | Yes | No |
| Photos | User-selected profile image | User-selected application/profile evidence | Product, business and document uploads |
| Documents | No broad storage access | User-selected application documents | User-selected onboarding documents |
| Biometrics | Local sign-in convenience | Local sign-in convenience | Local sign-in convenience |
| Notifications | Runtime notification support where enabled | Assignment/operational notifications where enabled | Order/business notifications where enabled |

## Build gate

- `APP_VARIANT=production`.
- API is `https://karigo-8htn.onrender.com/api/v1`.
- Customer and Captain production Maps key names exist in EAS; values are never printed.
- No development client, staging package or staging channel.
- `android.permission.RECORD_AUDIO` and `android.permission.SYSTEM_ALERT_WINDOW` are explicitly blocked for all apps. Customer and Partner also block camera/write-storage because they only choose existing files.
- Android app-data backup is disabled for all three production apps.
- No OTA is published to a runtime older than 1.0.0.

The repeatable native check is `scripts/inspect-aab-native-alignment.py`. Temporary AAB inspection files are not source artifacts and must not be committed.
