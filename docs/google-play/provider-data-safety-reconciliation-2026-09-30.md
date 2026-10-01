# Three-app provider and Google Play Data safety reconciliation — 30 September 2026

Status: **PROVIDER EVIDENCE CLOSED — DATA SAFETY READY** as of 1 October 2026. Historical provisional analysis below is retained for traceability and is superseded by `task209b-provider-evidence-closure-2026-10-01.md`. No Play form, CSV, release or declaration was changed.

## Decisions now supported

1. Render-hosted application payloads are collected but the Render hosting transfer qualifies for the service-provider exception under incorporated Terms/DPA. Separate Render service telemetry is not automatically exempt.
2. Resend message/recipient payloads qualify for the service-provider exception under its incorporated Terms/DPA. Separate account/service telemetry remains separate.
3. Google Maps flows are shared. Google and KariGO are controllers for Maps data, and Google receives/retains coordinates, search terms, IP/SDK/device/diagnostic/interaction data to provide and improve Google services.
4. Partner has no production device-location dependency, permission or API path. A typed business address is Personal info > Address, not device location.
5. No Customer or Captain input/code path collects raw card credentials or a customer's bank account. Flutterwave checkout is hosted. KariGO sends reference, amount, currency, name/email/phone and metadata.
6. `User payment info` still cannot be removed with full confidence because KariGO persists the complete Flutterwave verification/webhook provider response. A redacted production returned-field inventory must show that no response field maps to Play's financial-account/payment-instrument category; then storage should be allowlisted.
7. Captain RTC code disables recording and stores call metadata, not audio. Agora states production RTC audio is streamed and not stored, but production activation and account terms/settings are not confirmed.
8. Captain S3 storage remains unidentified and deletion currently marks database metadata only. Partner uploads use Render-local storage and may receive public URLs.

## Sharing outcomes by transfer

| Transfer | Outcome | Basis |
| --- | --- | --- |
| App → KariGO backend/Render application payload | **COLLECTED BUT NOT SHARED** for Render hosting | Render DPA processor scope and incorporated Terms; first-party KariGO remains responsible. |
| Backend → Resend email payload | **COLLECTED BUT NOT SHARED** | Resend DPA processor scope incorporated through Terms/account use. |
| Customer/Captain app or backend → Google Maps | **COLLECTED AND SHARED** | Controller-to-controller Maps terms and independent service-improvement use. |
| App → Expo Updates | **COLLECTED; sharing PARTIAL/NOT CONFIRMED** | Instruction-only User Data has processor terms; identifiable telemetry and controller use are not mapped sufficiently. |
| Customer/Captain push token/payload → Expo/FCM | **COLLECTED; sharing NOT CONFIRMED** | Processor terms exist, but sender activation, service telemetry and account terms/settings need confirmation. |
| Customer/Captain RTC → Agora | **NOT CONFIRMED activation** | Conditional processor evidence and non-recording implementation exist; account/config evidence is missing. |
| User-initiated hosted checkout → Flutterwave | **COLLECTED; may be exempt as user-initiated, not as service provider** | User reasonably requests payment; Flutterwave also acts independently for fraud/legal/improvement. Confirm exact product/consent and returned fields. |
| Captain document → S3-compatible storage | **NOT CONFIRMED** | Provider, region, agreement and lifecycle unknown. |
| Assigned party receives order/Ride identity, address or location | **COLLECTED; expected user-initiated transfer can be exempt from sharing** | Transfer is necessary to the specific order/Ride requested by the user. Validate disclosure/expectation per flow. |
| Termii, direct FCM, Utilities, Meta WhatsApp | **NOT CONFIRMED** | Implementation exists but production selector/activation is not evidenced. |

## Customer field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Name, phone, user ID | Yes; account-required and retained | Account, functionality, security | Render exempt; assigned fulfilment transfer may be user-initiated; provider-specific fields otherwise unresolved. |
| Email | Yes when supplied; optional and retained | Account and developer communications | Resend payload exempt; Render exempt. |
| Address | Yes for delivery/Ride; feature-required and retained | Fulfilment, account/support | Render exempt; assigned party may be user-initiated; Maps route/geocode **shared** where sent. |
| Profile image | Yes when chosen; optional and retained where upload succeeds | Profile functionality | Hosting path/access lifecycle must be confirmed; do not assume object-storage flow. |
| Approximate/precise location | Yes when user invokes address/Ride; foreground, feature-dependent; operational records retained | Functionality, safety, routing | Google Maps **shared**; assigned active Ride/Delivery transfer may be user-initiated; Render exempt. |
| User payment info | App/backend input: no raw card/bank credentials. Full provider response retention creates unresolved instrument-metadata scope. | Payment/finance/fraud | **Do not remove yet.** Complete redacted returned-field inventory and allowlist storage first. |
| Purchase history | Yes; transaction-required and retained | Fulfilment, finance, support/security | Render exempt; operational counterparties expected; payment flow assessment applies. |
| Other financial info | Yes: wallet ledger, amount, payment reference/status/refund/commission-related records; retained | Finance, functionality, fraud/security | Render exempt; Flutterwave user-initiated/independent-role analysis pending exact flow. |
| Other in-app messages | Yes when support/Ride chat used; retained | Functionality, support, safety/security | Render exempt; other Ride participant receives content as expected action. |
| Photos/files | Profile/evidence/content only when chosen; retained | Functionality/profile | Hosting/access lifecycle must be mapped. |
| Voice/audio | Only if Agora Ride calls are production-enabled; stream only, call metadata retained | Functionality | **NOT CONFIRMED** until activation/contract/settings evidence. |
| App interactions/searches/user content | Orders/Rides/support/reviews/actions retained; Maps searches/interactions and Expo update events transmitted | Functionality, security; provider analytics where documented | Maps portions **shared**; Expo telemetry unresolved; Render exempt. |
| Crash logs/diagnostics | No Crashlytics/Sentry; Maps SDK and potentially Expo/Agora transmit diagnostics | Reliability/analytics | Maps diagnostics **shared**; Expo/Agora unresolved. |
| Device/install identifiers/push token | Yes for sessions and Customer push registration; retained/rotated | Security, notifications, functionality | Maps identifier **shared**; Expo/FCM unresolved; Render exempt. |

## Captain field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Name, email, phone, user ID | Yes; core identity retained; email can be optional | Account, work, communications, security | Render/Resend exempt; assigned Customer sees safe identity as expected fulfilment. |
| Approximate/precise/background location | Yes while online/assigned active work; operational traces/evidence retained; required only for that work | Dispatch, navigation, safety/security | Maps location **shared**; active Customer/operations transfer expected; Render exempt. |
| Ride/Delivery traces and activity | Yes; assignment/status/timing/chat/call events retained | Functionality, safety, support, security | Render exempt; counterparties expected; Maps portions shared. |
| Earnings/payment references | Yes; earnings, commission, transaction reference/status retained | Finance, account, fraud/security | Render exempt; Flutterwave flow needs product-specific result. |
| Vehicle/identity photos and documents | Yes for application/approval; retained | Eligibility, safety, compliance | **S3 storage NOT CONFIRMED**; admin access is first-party. |
| Push/device IDs | Yes; Expo token registered and retained/rotated | Assignments, calls, security | Expo/FCM sharing unresolved; Render exempt. |
| Diagnostics | Maps; Expo Updates; Agora if calls active | Reliability/analytics | Maps **shared**; Expo/Agora unresolved. |
| Voice/audio | If Agora enabled: stream transmitted; KariGO recording false; provider says RTC stream not stored. KariGO retains session metadata/duration. | Ride communication | Conditional service-provider exception; activation/account/config **NOT CONFIRMED**. |
| Chat/messages | Ride chat retained; no inbox email/SMS collection | Functionality, safety/support | Render exempt; recipient receives as user action. Remove Email/SMS message-content categories unless another path is proven. |

## Partner field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Business/contact identity, address, user ID | Yes; role-required and retained | Account, marketplace, compliance/security | Render exempt; approved public/fulfilment identity is expected feature transfer. |
| Device ID | Session/device identifiers exist; no Partner push-registration path found | Security/functionality | Render exempt; Expo Updates telemetry unresolved. |
| Purchase/order activity | Yes; orders, fulfilment and history retained | Functionality, finance/support | Render exempt; Customer/Captain fulfilment transfer expected. |
| Financial/payment references | Yes; onboarding payment, payout account number, settlement and references retained | Finance, account, compliance/fraud | Partner **does** provide a raw payout bank account number to KariGO. Flutterwave onboarding flow remains flow-specific. |
| Product/service images | Yes when chosen; local backend file upload and public URL | Catalogue/functionality | Render hosting exempt; public listing is intended publication, but access controls/lifecycle require review. |
| Files/documents | Yes for onboarding/commercial evidence; retained | Approval/compliance | Render-local/database paths; retention/deletion must be established. |
| App interactions/user content | Catalogue, pricing, availability, order and support actions/content retained | Functionality/security | Render exempt; public/fulfilment recipients as expected. |
| Messages/support | Other in-app/support content only where used; no inbox email/SMS collection | Support/functionality | Render/Resend exempt for applicable payload; remove Email/SMS content absent evidence. |
| Diagnostics | Expo Updates/network telemetry; no Crashlytics/Sentry | Reliability/analytics | Expo telemetry unresolved. |
| Approximate/precise location | **NOT COLLECTED.** No location package, permission or production code path. Business address is not device location. | Not applicable | Remove both Partner device-location types. |

## Raw payment-account answer

**Does KariGO ever receive raw card/bank/payment-account data?**

- Customer and Captain: no raw card entry or bank-account field exists in the reviewed apps/backend checkout inputs. Flutterwave hosted checkout receives payment credentials directly. KariGO sends identity/contact, reference, amount, currency and metadata.
- Partner: yes, KariGO receives and stores a 10-digit vendor payout bank account number in its own backend. This must be declared for Partner under the applicable financial category.
- Customer `User payment info`: removal is **not yet evidence-closed** because full Flutterwave response JSON is stored. Obtain a redacted production response-field inventory and change persistence to an allowlist before concluding no payment-instrument information is received.

## Remaining evidence and readiness

See `provider-owner-evidence-checklist-2026-09-30.md`. The missing essentials are Captain storage identity/lifecycle, Flutterwave returned fields and account terms, Agora activation/recording/account terms, Expo telemetry/account terms, direct FCM/push selector state, Termii/Utilities selectors and agreements, and Maps enabled-API inventory.

Ready to complete Play Step 4: **PARTIAL**. Evidence-supported category, purpose, retention and Google Maps sharing answers can be prepared. Provider-dependent sharing answers listed as unresolved must remain unresolved until the named records are supplied.

## Task 209B-S1-H11.2P reconciliation update — 2026-09-30

Implementation now minimizes new persisted payment evidence, physically deletes eligible Captain/private Partner objects before reporting deletion, and records defined retention states. This does not resolve provider-sharing answers. Customer `User payment info` remains **NOT CONFIRMED** until legacy Flutterwave JSON is cleaned and all other production paths are verified. Captain storage sharing remains unresolved because the provider and contract are unconfirmed. The seven Partner historic approval records have no recoverable source objects and require fresh private evidence rather than migration.

## Task 209B-S1-H11.2Q read-only reassessment — 2026-09-30

No Google Play Console answer was opened, saved or submitted for this update.

### Customer

- `User payment info`: **do not remove yet**. New writes are allowlisted, but historic Flutterwave JSON has not been inventoried or cleaned on an authorized production copy. Removal becomes supportable only after the production dry run, owner-approved cleanup, post-cleanup verification, and confirmation that no other path stores payment instruments.
- `Purchase history`: remains collected for orders, receipts, fulfilment and transaction history.
- `Other financial info`: remains collected for wallet ledger, amounts, references, statuses, refunds and reconciliation.
- Flutterwave sharing: unresolved until the exact flow, executed/incorporated merchant terms/DPA, provider independent uses and Play exception are evidenced.

### Captain

- Eligible unattached application documents have an implementation-backed physical deletion state; active/approved application evidence has a recorded retention reason. The duration remains unresolved.
- Provider identity, region, encryption/versioning configuration, DPA, subprocessors and independent uses remain missing. Storage sharing must remain unresolved.

### Partner

- New private onboarding files now have a durable S3-compatible production design, authenticated vendor-scoped retrieval, explicit object keys and delete support. Production provisioning is not complete.
- Catalogue/service/logo/cover media remains intentionally public and must stay classified separately.
- Historic onboarding files cannot be described as private until the counts-only inventory and controlled migration complete.
- Eligible unapproved private documents can be deleted; approved evidence is retained with a defined state but an unresolved duration.
- Existing Play categories should change only after deployed behavior and the legacy migration are verified. Provider sharing remains unresolved.

## Task 209B-S1-H11.2X Data Safety reconciliation — 2026-09-30

No Play Console state changed.

### Captain

- The storage provider and bucket controls are now verified: GCS, `us-south1`, Standard, uniform access, Google-managed encryption, no public IAM, seven-day soft delete, versioning off, and no lifecycle/retention lock.
- Public Access Prevention is not enforced. This is a hardening gap, although the current IAM policy is not public.
- The Google Cloud account now confirms acceptance of the June 8, 2026 Cloud Data Processing Addendum on September 30, 2026. The payment profile identifies **Zamkah Technologies Limited** for linked account `My Maps Project` and project `mystical-method-475123-s9`.
- The account-incorporated DPA supports instruction-bound processor treatment for Customer Data, but Google independently processes separate Service Data for security, fraud prevention, analytics, recommendations, and improvement.
- Result after request-path review: Captain `Files and documents` and associated user/document metadata are **COLLECTED BUT NOT SHARED** for GCS under the service-provider exception. They are retained, not ephemeral, for functionality, onboarding/account administration, and security/compliance. Admin signed-GET Service Data is separate and does not change the Customer Data result.
- Deletion text must disclose that live deletion is followed by seven days of recoverability; the account-incorporated DPA allows up to 180 days for provider-system deletion after data becomes customer-unrecoverable, subject to law.

### Partner

- The proposed private GCS bucket does not create a new Play category. The seven approved onboarding records remain `Files and documents`, collected for onboarding/compliance.
- Catalogue, service, logo, and cover media remain intentionally public outside the private bucket.
- For the planned governed-account GCS design, Partner private onboarding files are **COLLECTED BUT NOT SHARED** under the service-provider exception. The path is fully backend-mediated and retained, not ephemeral. This classification becomes production-applicable only after the bucket, deployment, and legacy migration are separately approved and verified.
- The seven-record plan is compatible with copy, verify, manifest, authenticated retrieval, retention-state preservation, verified source deletion, retry, and rollback.


## Task 209B-S1-H11.2Y DPA reconciliation update — 2026-09-30

- Account-specific DPA acceptance: **VERIFIED** for **Zamkah Technologies Limited**, linked account `My Maps Project`, project `mystical-method-475123-s9`.
- Accepted document: Customer Cloud Data Processing Addendum, last modified **June 8, 2026**; Google Cloud shows acceptance on **September 30, 2026**.
- Cloud Terms incorporation: the DPA incorporates the applicable Agreement, but a separate account Cloud Terms/order-form acceptance record was not exported.
- Subprocessors/transfers: the accepted DPA incorporates the referenced subprocessor and restricted-transfer mechanisms.
- Google Play conclusion at the DPA-only stage was provisional. Task 2Z subsequently mapped the exact request paths and supports the service-provider exception for Captain Customer Data and the planned backend-mediated Partner GCS flow. No Play answer changed.

## Task 209B-S1-H11.2Z GCS classification — 2026-09-30

### Captain

- Upload: Captain app → KariGO backend → GCS `PutObject`.
- Read: authorized admin → KariGO backend for a five-minute signed URL → admin browser direct GCS `GetObject`.
- Delete: Captain/account workflow → KariGO backend → GCS `DeleteObject`.
- Signed URL: read only; no signed upload and no Captain mobile app-to-GCS request.
- Customer Data: file bytes, user/document association in the key, document type, original filename metadata, MIME type and size. Collected and retained; not ephemeral.
- Service Data: account/configuration/resource attributes, service authentication, backend/admin IP and technical identifiers, operational status, errors, performance, request and support records. Used for service operation, security/fraud prevention, diagnostics/support, analytics, recommendations and improvement. The Privacy Notice excludes Customer Data from Service Data.
- Play outcome: **COLLECTED BUT NOT SHARED** for GCS; **A — SERVICE-PROVIDER EXCEPTION SUPPORTED**. Purposes: app functionality, account/onboarding administration, fraud prevention/security/compliance.

### Planned Partner

- Recommended path: Partner app → KariGO backend → GCS for upload; GCS → KariGO backend → authenticated Partner for read; KariGO backend → GCS for delete.
- No signed URL, public URL, or direct Partner app-to-GCS request.
- Play outcome for the proposed same-account deployment: **COLLECTED BUT NOT SHARED**; **A — SERVICE-PROVIDER EXCEPTION SUPPORTED**. This remains a planned state until provisioning and deployment are verified.

### Data-minimization action

New Captain and Partner object keys should replace raw user/vendor UUIDs and document-type path segments with opaque provider-facing identifiers. Captain uploads should omit original filename from GCS metadata. This is an implementation improvement, not a blocker to the provider-role classification. No code or console state changed in this task.

## Task 209B-S1-H11.2AA minimization reconciliation — 2026-09-30

- The local backend now generates opaque keys for new Captain and Partner private documents and records provider/bucket alongside the existing KariGO-owned manifest metadata.
- Captain provider writes omit original-filename metadata; the filename remains in KariGO's application database where operationally required.
- Existing Captain objects remain readable through signed URLs and deletable using their stored legacy keys. No legacy object migration occurred.
- Partner new-write and seven-record migration keys contain neither raw vendor UUID nor database row ID. The keyed vendor namespace preserves cross-tenant verification.
- The Play result remains **COLLECTED BUT NOT SHARED under the GCS service-provider exception**. No Data Safety answer or production behavior changed because this code is not deployed.

## Task 209B-S1-H11.2AB provisioning reconciliation — 2026-09-30

- The dedicated governed-account Partner bucket now exists with private controls: PAP, uniform access, no public IAM, Google-managed encryption, seven-day soft delete, no versioning, no retention lock, and no lifecycle rule.
- This does not create a new Play data category. Partner onboarding evidence remains `Files and documents`, collected and retained for functionality, onboarding/account administration, and security/compliance.
- The GCS provider result remains **COLLECTED BUT NOT SHARED under the service-provider exception** for the documented backend-mediated path. It is not yet a live production transfer: the dedicated identity, HMAC credential, application key, Render configuration, deployment, and seven-file migration are all absent.
- Cloud Storage Data Access logging remains disabled because the available AuditConfig is project-wide across every bucket in `mystical-method-475123-s9`. The owner explicitly deferred that cross-bucket hardening change; it is recorded as an accepted operational limitation, not as a provider-role or bucket-provisioning failure.
- Google Play was not changed.

## Task 209B-S1-H11.2BC legacy-evidence closure — 2026-10-01

- Historical Partner approval records: 7.
- Recoverable legacy Partner document objects: 0.
- Physical legacy source objects retained for this set: 0.
- The database approval/audit rows remain retained separately from document-object storage.
- Reacquired evidence uses the live backend-mediated private GCS path and remains `Files and documents`; this closure does not change the provider-sharing result or any Play Console answer.

## Task 209B-S1-H11.2BJ closure update — 1 October 2026

Production Flutterwave legacy payload minimisation is complete and supports Customer `User payment info = NO`; it does not by itself prove Flutterwave's Play sharing exception. Partner private GCS is live and verified; both Captain and Partner private-document transfers qualify for the supported GCS service-provider exception. Google Maps remains shared. Expo/FCM sharing, Flutterwave independent-use/contract treatment, and current Agora activation/account/recording state remain NOT CONFIRMED. Detailed final answers and the read-only Play review are in `task209b-final-closeout-2026-10-01.md`.

## Task 209B-S1-H11.2BK final provider reconciliation — 1 October 2026

The remaining provider-dependent rows are resolved in `task209b-provider-evidence-closure-2026-10-01.md`: Flutterwave is classified per transfer without a blanket exception; Expo Push/EAS use evidenced service-provider treatment; direct FCM is not applicable; Agora is active audio-only with signed-in project evidence that Cloud Recording is inactive; Termii's actual SMS payloads are shared; Utilities fulfilment is inactive. Provider-dependent unresolved count is **0** for Customer, **0** for Captain and **0** for Partner. The three worksheets are ready to complete truthfully from the final matrix. Owner/legal retention-duration decisions remain a separate governance item and do not leave a provider-sharing row unresolved. Production changed: **NO**. Google Play changed: **NO**.
