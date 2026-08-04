# Customer Android permissions

## Source-level purpose inventory

| Permission/capability | Purpose |
| --- | --- |
| Internet/network state | HTTPS API, maps, hosted checkout and updates |
| Fine/coarse foreground location | User-selected address, pickup/destination and Ride map |
| Photos/media selected by user | Optional profile image |
| Biometric capability | Optional local sign-in unlock; credentials remain in secure storage |
| Notifications, if declared by generated build | Transactional account/order/Ride updates when enabled |

Not intended: background location, contacts, SMS, call log, broad storage, install packages or microphone.

## Final merged AAB manifest

Build `70d952a9-6fb4-45e9-a68d-05ee64723807` declares:

| Permission | Purpose |
| --- | --- |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | Foreground address, Ride pickup/destination and map selection |
| `INTERNET`, `ACCESS_NETWORK_STATE` | HTTPS API, maps, hosted checkout and updates |
| `READ_EXTERNAL_STORAGE` | User-selected media compatibility on older supported Android versions |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | Optional local biometric sign-in |
| `VIBRATE` | Local notification/haptic feedback |
| `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE` | Expo updates/background work and foreground location support; no background-location permission is declared |
| App-scoped dynamic receiver permission | Protects dynamically registered internal receivers |

The launcher/deep-link activity supports `karigo-customer`. Library components exported by the merged manifest are the image crop activity plus WorkManager/profile diagnostic components; the latter are protected by Android system permissions. Providers are not exported. Backup is disabled and no cleartext override is present. Camera, write-storage, microphone, overlay, background-location, contacts, SMS and call-log permissions are absent.
