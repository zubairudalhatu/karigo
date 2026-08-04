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

Pending generated AAB inspection. Record every `uses-permission`, exported component, deep-link scheme and cleartext/backup setting here before Play upload.
