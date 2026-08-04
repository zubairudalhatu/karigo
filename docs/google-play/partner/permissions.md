# Partner Android permissions

## Source-level purpose inventory

| Permission/capability | Purpose |
| --- | --- |
| Internet/network state | HTTPS API and updates |
| Photos/media selected by user | Product, service, business logo and cover images |
| Documents selected by user | Partner onboarding/compliance evidence |
| Notifications, if declared by generated build | Order/account updates when enabled |

Device location, contacts, SMS, call log, microphone and broad storage are not required by the current app.

## Final merged AAB manifest

Build `effbe636-d5f4-4aa0-b69b-d1df7d1270d3` declares:

| Permission | Purpose |
| --- | --- |
| `INTERNET`, `ACCESS_NETWORK_STATE` | HTTPS API and updates |
| `READ_EXTERNAL_STORAGE` | User-selected product, service and document media compatibility on older Android versions |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | Optional local biometric sign-in |
| `VIBRATE` | Order/account notification feedback |
| App-scoped dynamic receiver permission | Protects dynamically registered internal receivers |

The launcher/deep-link activity supports `karigo-partner`. Library exported components are limited to the image crop activity and the profile installer receiver, which is protected by an Android system permission. Providers are not exported. Backup is disabled and no cleartext override is present. Location, camera, write-storage, microphone, overlay, contacts, SMS and call-log permissions are absent.
