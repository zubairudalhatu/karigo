# Captain Data Safety worksheet

Audit date: 30 September 2026. Status: **PARTIAL; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Name/email/phone/user ID | Collected and retained; core identity, with email optional where allowed | Render/Resend exempt; assigned Customer identity is expected fulfilment. |
| Approximate/precise/background location | Collected while online or assigned; traces/evidence retained; required only for active work | Google Maps **shared**; Render exempt; assigned Customer transfer expected. |
| Ride/Delivery traces and app activity | Assignments, status, timing, chat/call events retained | Render exempt; Maps portions shared; counterparties expected. |
| Earnings/payment references | Earnings, commission and transaction records retained | Render exempt; Flutterwave flow needs account/product evidence. |
| Vehicle/identity photos and files | Approval-required and retained | S3-compatible provider is **STORAGE BLOCKER — NOT CONFIRMED**. |
| Push/device IDs | Expo token and device/session IDs retained/rotated | Expo/FCM unresolved; Render exempt. |
| Diagnostics | Maps, Expo Updates and Agora if calls enabled | Maps **shared**; Expo/Agora unresolved. |
| Voice/audio | If enabled, Agora RTC stream is transmitted. KariGO code sets recording false and stores only session metadata/duration. Agora states RTC stream is not stored. | Conditional service-provider exception; production activation, account terms and dashboard recording settings remain unconfirmed. |
| Chat/messages | Ride chat retained; no email/SMS inbox reading | Render exempt; recipient receives through user action. Remove Email/SMS content absent another proven path. |

Captain document deletion currently changes the database status only; no S3 object deletion call was found. Do not claim object deletion, storage region, encryption at rest, backup expiry or provider retention until the owner supplies the storage record and lifecycle evidence.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

## Task 209B-S1-H11.2P implementation evidence — 2026-09-30

- Eligible unattached Captain documents are now deleted from S3-compatible storage before the database reports deletion.
- Failures remain `DELETION_FAILED`, retries are safe, and account deletion cannot complete while an eligible deletion fails.
- Documents attached to an application are `RETAINED_FOR_DEFINED_REASON` with `ACTIVE_APPLICATION_EVIDENCE`; no retention period is asserted.
- Storage provider identity and sharing status remain unconfirmed. Do not infer a Play service-provider exception.

## Task H11.2Q read-only update — 30 September 2026

- Eligible unattached document deletion and retained application-evidence states are implemented. Storage provider/DPA/configuration evidence remains unresolved; do not finalize sharing.
