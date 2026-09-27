# Captain Android permissions

## Source-level purpose inventory

| Permission/capability | Purpose |
| --- | --- |
| Internet/network state | HTTPS API, maps and updates |
| Fine/coarse foreground location | Operational map, availability and assigned work coordination |
| Photos/documents selected by user | Application, vehicle and profile evidence |
| Biometric capability | Optional local sign-in unlock |
| Notifications, if declared by generated build | Assignment and account updates when enabled |

September 2026 correction: background location is intentionally configured for accepted active Ride/Delivery work. Internal version 16 includes ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE_LOCATION and RECORD_AUDIO for optional Agora calls, as well as unnecessary media-projection and legacy storage permissions. Local config blocks the unnecessary permissions and adds disclosure/active-work lifecycle checks; it has not been shipped. Contacts, SMS, call log and broad storage are not required.

A new AAB must be inspected for merged permissions and service types before release. Expo config introspection and JavaScript export do not prove the final merged native manifest or device behavior.

## Historical merged AAB manifest (not the current internal release)

Build `f7afbcd7-bf24-422b-8ed9-948042cbdce3` declares:

| Permission | Purpose |
| --- | --- |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | Foreground operational map, availability and assignment coordination |
| `INTERNET`, `ACCESS_NETWORK_STATE` | HTTPS API, maps and updates |
| `CAMERA` | Captain-selected application/profile evidence capture |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | User-selected evidence compatibility on older supported Android versions |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | Optional local biometric sign-in |
| `VIBRATE` | Assignment/account notification feedback |
| `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE` | Expo updates/background work and foreground location support; no background-location permission is declared |
| App-scoped dynamic receiver permission | Protects dynamically registered internal receivers |

The launcher/deep-link activity supports `karigo-rider`. Library components exported by the merged manifest are the image crop activity plus WorkManager/profile diagnostic components; the latter are protected by Android system permissions. Providers are not exported. Backup is disabled and no cleartext override is present. Microphone, overlay, background-location, contacts, SMS and call-log permissions are absent.
