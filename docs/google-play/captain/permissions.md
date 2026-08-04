# Captain Android permissions

## Source-level purpose inventory

| Permission/capability | Purpose |
| --- | --- |
| Internet/network state | HTTPS API, maps and updates |
| Fine/coarse foreground location | Operational map, availability and assigned work coordination |
| Photos/documents selected by user | Application, vehicle and profile evidence |
| Biometric capability | Optional local sign-in unlock |
| Notifications, if declared by generated build | Assignment and account updates when enabled |

Background location is not intentionally configured. Contacts, SMS, call log and broad storage are not required.

## Final merged AAB manifest

Pending generated AAB inspection. Record every `uses-permission`, exported component, deep-link scheme and cleartext/backup setting here before Play upload.
