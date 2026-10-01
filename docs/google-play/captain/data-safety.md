# Captain Data Safety worksheet

Audit date: 30 September 2026. Status: **PARTIAL; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Name/email/phone/user ID | Collected and retained; core identity, with email optional where allowed | Render/Resend exempt; assigned Customer identity is expected fulfilment. |
| Approximate/precise/background location | Collected while online or assigned; traces/evidence retained; required only for active work | Google Maps **shared**; Render exempt; assigned Customer transfer expected. |
| Ride/Delivery traces and app activity | Assignments, status, timing, chat/call events retained | Render exempt; Maps portions shared; counterparties expected. |
| Earnings/payment references | Earnings, commission and transaction records retained | Render exempt; Flutterwave flow needs account/product evidence. |
| Vehicle/identity photos and files | Collected for application/approval and retained; GCS also receives user/document metadata, MIME, size and original-name metadata | **COLLECTED BUT NOT SHARED** for GCS under the service-provider exception. Functionality, account/onboarding, security/compliance. |
| Push/device IDs | Expo token and device/session IDs retained/rotated | Expo/FCM unresolved; Render exempt. |
| Diagnostics | Maps, Expo Updates and Agora if calls enabled | Maps **shared**; Expo/Agora unresolved. |
| Voice/audio | If enabled, Agora RTC stream is transmitted. KariGO code sets recording false and stores only session metadata/duration. Agora states RTC stream is not stored. | Conditional service-provider exception; production activation, account terms and dashboard recording settings remain unconfirmed. |
| Chat/messages | Ride chat retained; no email/SMS inbox reading | Render exempt; recipient receives through user action. Remove Email/SMS content absent another proven path. |

Captain document upload is backend-mediated; deletion now calls GCS `DeleteObject` before the database records physical deletion. Authorized admin reads use a backend-created signed `GetObject` URL valid for five minutes. The Captain app does not connect directly to GCS.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

## Task 209B-S1-H11.2P implementation evidence — 2026-09-30

- Eligible unattached Captain documents are now deleted from S3-compatible storage before the database reports deletion.
- Failures remain `DELETION_FAILED`, retries are safe, and account deletion cannot complete while an eligible deletion fails.
- Documents attached to an application are `RETAINED_FOR_DEFINED_REASON` with `ACTIVE_APPLICATION_EVIDENCE`; no retention period is asserted.
- Storage provider identity, governed-account DPA, and request path are confirmed. Task 2Z supports the Play service-provider exception for GCS Customer Data.

## Task H11.2Q read-only update — 30 September 2026

- Eligible unattached document deletion and retained application-evidence states are implemented. Provider, DPA, bucket, and request-path evidence are now verified; Task 2Z supports `Not shared` for the GCS transfer under the service-provider exception.

## Task 209B-S1-H11.2Z GCS decision — 30 September 2026

- Upload: Captain app → KariGO backend → GCS. File bytes never travel directly from the Captain app to GCS.
- Read: authorized admin requests a backend-generated signed GET URL, valid for 300 seconds; the admin browser then retrieves the object directly from GCS.
- Delete: client/account workflow → KariGO backend → single-key GCS `DeleteObject`. No client-side delete path.
- Classification: identity/application files, vehicle files, other Captain documents, and associated user/document metadata are collected, retained, and not ephemeral. The GCS transfer is **not shared under Google Play's service-provider exception** because the accepted DPA restricts Customer Data to KariGO instructions.
- Google separately processes Service Data for service operation, security/fraud prevention, diagnostics/support, analytics, recommendations and improvement. Service Data excludes Customer Data; the admin/browser signed-GET telemetry does not create a new Captain-app category.
- Key privacy: current keys expose raw Captain user UUID and document type; signed URLs reproduce the key, and `originalName` is stored as GCS object metadata. Use opaque keys and omit original filenames for new writes; retain compatibility for existing objects.
- Play Console unchanged.

## Task 209B-S1-H11.2AA local minimization update — 30 September 2026

- New local code generates `captain-private/{opaque}/{opaque}.{extension}` keys and sends no original-filename GCS metadata.
- KariGO's database continues to hold the Captain owner, document type, display filename, MIME type, size, provider/bucket, object key, deletion state, and retention state.
- Stored legacy keys still support signed viewing and deletion; no production object was renamed or migrated.
- The GCS service-provider exception remains supported. Production claims remain based on the deployed legacy behavior until this change is separately deployed and verified.

## Task 209B-S1-H11.2BJ final reconciliation — 1 October 2026

Private GCS storage, opaque new keys, provider-confirmed deletion, the active-work location lifecycle, and saved Play FGS/background-location declarations are verified. Files/documents are collected, retained and not shared for the GCS transfer under the supported service-provider exception. Maps fields are shared. Expo/FCM sharing and current Agora RTC activation/account/recording state remain NOT CONFIRMED; voice/audio must remain conditional. See `../task209b-final-closeout-2026-10-01.md`.
