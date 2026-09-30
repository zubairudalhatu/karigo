# Google Cloud Storage evidence — 30 September 2026

Tasks: `209B-S1-H11.2X`, `209B-S1-H11.2Y`, `209B-S1-H11.2Z`

Status: **GCS REQUEST PATH CLASSIFIED; SERVICE-PROVIDER EXCEPTION SUPPORTED FOR CUSTOMER DATA. TERMS-RECORD, KEY-MINIMIZATION, AND HARDENING GATES REMAIN.** No bucket, object, IAM, production, Google Play, or deployment state was changed.

## Evidence boundary

- Console inspection used the authorized Google Cloud account and the existing Captain bucket only.
- Project context: display name and linked billing-account name `My Maps Project`, project ID `mystical-method-475123-s9`; the payment profile identifies the organization as **Zamkah Technologies Limited**. Payment profile IDs, billing identifiers, addresses, and the signed-in human identity are intentionally omitted.
- Bucket: `karigo-captain-uploads`.
- Objects were not opened, downloaded, uploaded, modified, or deleted. The inspection did not enumerate user files beyond the top-level bucket view already rendered by the Console.
- Official terms and product documentation were reviewed on 30 September 2026. Account acceptance is supported separately by the persisted Console confirmation recorded below.

## Captain bucket state

| Control | Verified state | Assessment |
| --- | --- | --- |
| Location / type | `us-south1` (Dallas), single region | Confirmed. |
| Default storage class | Standard | Confirmed. |
| Public access status | Not public | No public IAM principal was present. |
| Public Access Prevention | Not enforced by bucket or organization policy | Hardening gap. Current state is private, but a future IAM edit could grant public access. |
| Uniform Bucket-Level Access | Enabled (`Uniform`) | Object ACLs are disabled; IAM is the effective access system. |
| Public principals | No `allUsers`, `allAuthenticatedUsers`, or equivalent anonymous grant | **Public-access classification B: NO PUBLIC IAM BUT PAP NOT ENFORCED.** |
| Non-public IAM | Project basic-role principals, one dedicated Captain service account, and one named user | No identities are reproduced here. Project viewers have inherited legacy object-reader access; review least privilege separately. |
| Default encryption | Google-managed key | No key material inspected. Google-managed and Cloud KMS keys are allowed; customer-supplied keys are restricted. |
| Object versioning | Off | Overwrite rollback does not rely on Object Versioning. |
| Soft delete | Enabled, 7 days | A deleted live object remains provider-recoverable for seven days. |
| Lifecycle rules | None | No automated expiration or storage-class transition. |
| Bucket retention policy / lock | None; no lock | No bucket-level minimum retention period. |
| Object retention / default event hold | Disabled / disabled | No per-object retention lock or default hold. |
| Requester Pays | Off | Confirmed. |
| CORS / IP filtering | Not enabled / not configured | The current signed/authenticated retrieval design does not require browser CORS. |
| Data Access audit logs | Disabled for Google Cloud Storage: Admin Read, Data Read, and Data Write | Admin Activity audit logs remain available by Google default, but object read/write/delete access is not covered by Data Access logs in this project. No exempted principals were shown. |
| Usage/storage logs | Not evidenced | The bucket Observability view exposed metrics, not a bucket usage-log configuration. |

## Deletion meaning

`DeleteObject` removes the live object from normal application access, but it is not immediate erasure from every provider recovery system:

1. The bucket retains a soft-deleted, recoverable copy for seven days.
2. The current public Cloud Data Processing Addendum says that, once customer-deleted data is no longer recoverable by the customer, Google will carry out the deletion instruction as soon as reasonably practicable and within a maximum of 180 days, unless applicable law requires storage.
3. The project Privacy & Security page now verifies account-specific acceptance of the June 8, 2026 Addendum on September 30, 2026. The 180-day outer limit is therefore account-bound DPA evidence for Customer Data, subject to the Addendum and applicable law.

KariGO privacy text and deletion operations must therefore distinguish: live-object deletion, seven-day provider recovery, and final provider-system deletion. They must not promise instant erasure from all backups.

## Contract and provider-role evidence

| Evidence | Result |
| --- | --- |
| Current Google Cloud Terms | The accepted DPA is incorporated into the applicable Agreement. The payment profile identifies **Zamkah Technologies Limited** and the linked account/project, but no separate Cloud Terms acceptance timestamp, order form, reseller agreement, or accepted Terms version was exported. **Broader Agreement record: still required.** |
| Cloud Data Processing Addendum | **Account-specific acceptance verified.** The June 8, 2026 Customer version was accepted on September 30, 2026 for the Google Cloud account linked to `mystical-method-475123-s9`; the payment profile names **Zamkah Technologies Limited**. The Console displayed the accepted state after the authorized owner confirmation. |
| Subprocessors | The accepted Addendum incorporates the referenced Google Cloud subprocessor framework: written downstream obligations, Google liability, and advance notice for new subprocessors. The current public list was reviewed; no separate account notification-subscription record was captured. |
| Transfers | The accepted Addendum includes SCC and alternative restricted-transfer mechanisms where applicable. The Console presents a separate European-law certification only for qualifying customers with billing addresses outside Europe, the Middle East, and Africa; no such separate certification was made in this task. |
| Security/privacy | Current DPA, Cloud Privacy Notice, access-control, encryption, signed-URL, soft-delete, and audit-log documentation available. |

Google's Cloud Privacy Notice separately states that Google independently processes **Service Data**—account, billing, configuration, authentication, IP, operational, error, quality, and performance data—for delivery, security, fraud prevention, recommendations, analytics, and product improvement. It expressly separates Service Data from stored Customer Data. That distinction prevents a blanket service-provider conclusion across both payload and telemetry.

### Google Play implication

- Captain document payloads, associated user/document metadata, and object keys supplied through the governed account are Customer Data. The accepted Addendum requires Google to process that data only to provide, secure, and monitor the service and according to KariGO instructions.
- Google separately processes Service Data: account and billing records, configuration/resource attributes, authentication details, IP/device or token identifiers, operational status, errors, quality/performance metrics, support communications, and usage logs. The Cloud Privacy Notice expressly excludes Customer Data from Service Data.
- Therefore Captain `Files and documents`, the object-key user ID/document type, MIME type, size, and original-name metadata are **COLLECTED BUT NOT SHARED** for the GCS transfer under Google Play's service-provider exception. The data is retained, not ephemeral. Purposes are app functionality, account/onboarding administration, and fraud prevention, security, and compliance.
- The planned Partner private-document path also supports the service-provider exception if provisioned in this governed Google Cloud account: Partner app → KariGO backend → GCS for upload, read, and delete. No direct Partner app-to-GCS request or signed URL is implemented.

Official sources:

- https://cloud.google.com/terms/
- https://cloud.google.com/terms/data-processing-addendum
- https://cloud.google.com/terms/subprocessors
- https://cloud.google.com/terms/cloud-privacy-notice
- https://support.google.com/cloud/answer/6329727
- https://cloud.google.com/storage/docs/public-access-prevention
- https://cloud.google.com/storage/docs/uniform-bucket-level-access
- https://cloud.google.com/storage/docs/access-control/signed-urls
- https://cloud.google.com/storage/docs/audit-logging

## Proposed Partner private bucket

Proposed name: `karigo-partner-private-uploads` (availability must be checked only at the approved provisioning action).

| Setting | Proposed configuration |
| --- | --- |
| Project | Prefer a dedicated KariGO production storage project. If the existing project is used, first remove unintended project-wide object readers and document inherited IAM. |
| Location | `europe-west3` (Frankfurt), single region, to align with the Render production service/database; owner/legal must approve the data-location choice. |
| Storage class | Standard. |
| Public access | Enforce Public Access Prevention at bucket creation. |
| Access control | Uniform Bucket-Level Access from creation; no ACLs. |
| IAM | Dedicated runtime service account with bucket-scoped `roles/storage.objectUser`; separate narrowly scoped migration identity, time-bounded and revoked after the seven records; named human admin group only. No public principals and no broad project basic-role object access. |
| Encryption | Google-managed keys initially. Require CMEK instead only if owner/legal or a documented compliance requirement mandates customer-managed keys. |
| Object versioning | Off. Use soft delete and the migration source/checkpoint for rollback; this avoids indefinite noncurrent versions. |
| Soft delete | Seven days for operational rollback, with privacy wording reflecting provider recovery. |
| Lifecycle | No delete/archive rule until owner/legal approves retention durations. After approval, add narrowly scoped age rules that cannot delete `APPROVED_ONBOARDING_EVIDENCE` before its lawful retention period. |
| Retention/lock | No bucket lock at creation. Store application retention reason/state. Add a lock only after legal duration approval because locking is difficult or impossible to reverse. |
| CORS | None unless a tested direct-browser upload/download flow needs it; if required, allow only exact production origins, HTTPS methods, and required headers. |
| Namespace | Private onboarding/evidence keys only; deterministic opaque keys. Catalogue, service, logo, and cover assets remain outside this bucket. |
| Retrieval | Backend-authorized retrieval or short-lived signed URLs; never persistent public URLs. |
| Deletion | Single-key delete support with head/absence verification, explicit lifecycle state, retry, and audit result. |
| Logging | Enable Cloud Storage Data Access logs for Data Read and Data Write before production use; keep Admin Activity; review cost/retention. |
| Network/API | XML/S3-compatible path-style endpoint `https://storage.googleapis.com`, matching the implemented driver. |

This design is complete enough for a provisioning review. It is not authorization to create the bucket.

## Seven-record migration compatibility

The proposed bucket supports the approved seven-record plan:

- upload/copy to deterministic private keys;
- destination size/checksum/head verification;
- manifest upsert and reference switch;
- backend or short-lived signed retrieval;
- preserved `APPROVED_ONBOARDING_EVIDENCE` state;
- exact-source deletion only after destination and access verification;
- idempotent retry via deterministic keys and states; and
- rollback through the still-public source before deletion, then the seven-day soft-delete/private checkpoint after deletion.

No new Google Play data category is created: the seven records remain Partner `Files and documents` collected for onboarding/compliance. The change improves access control and changes the storage recipient. DPA incorporation is now verified; sharing remains unresolved until the Service Data and actual request-path assessment is closed.

## Gates and classification

Overall storage-readiness classification: **B — PARTIAL: AGREEMENT-RECORD, OBJECT-KEY MINIMIZATION, AND HARDENING EVIDENCE STILL REQUIRED.** Google Play provider-role classification for the documented Customer Data transfers: **A — SERVICE-PROVIDER EXCEPTION SUPPORTED.**

Before provisioning:

1. Preserve the verified DPA acceptance evidence: **Zamkah Technologies Limited**, linked account `My Maps Project`, project `mystical-method-475123-s9`, June 8, 2026 DPA, accepted September 30, 2026.
2. Preserve the Google Cloud Terms/order-form acceptance record or reseller/offline agreement identifying Zamkah Technologies Limited and the governed account.
3. Deploy and verify the locally prepared opaque-key implementation. New Captain keys use random provider-facing segments; new Partner keys use a keyed opaque vendor namespace plus a random object identifier. Captain original filenames remain only in KariGO database records. Legacy keys remain readable/deletable and are not rewritten by this change.
4. Approve the Partner location and Google-managed-key choice.
5. Approve creation of the separate Partner bucket with PAP enforced, uniform access, scoped IAM, seven-day soft delete, and Data Access logs enabled.
6. Treat Captain PAP enforcement, least-privilege IAM, and Data Access logging as a separate change requiring its own review and approval.


## Task 209B-S1-H11.2Y DPA acceptance evidence — 2026-09-30

- Contracting organization verified from the account payment profile: **Zamkah Technologies Limited**.
- Governed context: linked account **My Maps Project** and project `mystical-method-475123-s9`.
- Accepted document: Google Cloud Data Processing Addendum, Customer version last modified **June 8, 2026**.
- Console confirmation: **Reviewed and accepted on Sep 30, 2026**. The acceptance was observed at `2026-09-30T22:02:04+01:00`; Google displayed the date but no time or separate confirmation reference.
- The accepted Addendum incorporates the applicable Cloud Agreement, restricted-transfer mechanisms, and the referenced subprocessor framework. A separate Cloud Terms/order-form acceptance record was not exported.
- This closes the account-specific DPA-incorporation gap for Customer Data. It does **not** establish a blanket Google Play service-provider exception because Google separately processes Service Data and the actual signed-URL/API request data flow still requires mapping.
- No bucket, IAM, audit-log, object, deployment, Google Play, or Git remote state changed.

## Task 209B-S1-H11.2Z request-path and Service Data classification — 2026-09-30

### Evidence status

**Account-specific verified:** payment-profile entity **Zamkah Technologies Limited**; linked billing/account name `My Maps Project`; project `mystical-method-475123-s9`; active Captain GCS bucket association; June 8, 2026 Customer DPA accepted September 30, 2026 and persisted after reload.

**Public terms only:** current Google Cloud Terms, current Google Cloud Privacy Notice effective September 28, 2026, and current GCP subprocessor list. No separate account Cloud Terms acceptance timestamp/version, order form, reseller agreement, or billing-account terms export was available. The DPA is itself account-specific and expressly incorporated into the applicable Agreement, so this audit-record gap does not displace its processor restrictions for Customer Data.

### Captain production request path

| Operation | Actual path | Data sent to Google | Direct client request |
| --- | --- | --- | --- |
| Upload | Captain mobile app sends an authenticated multipart file and document type to the KariGO backend. The backend validates it, constructs the object key, and issues S3-compatible `PutObject` to GCS. | File bytes; `Content-Type`; object key; original filename in object metadata; backend service identity/authentication; backend egress IP/network and request diagnostics. | No Captain app → GCS request. |
| Read | An authorized admin requests a view URL from the KariGO backend. The backend locally creates a signed `GetObject` URL valid for 300 seconds; the admin browser opens it and receives the file directly from GCS. | Customer Data: object key and file bytes. Service Data: signed-request authentication details, admin/browser IP and technical identifiers, request timing/status and diagnostics. | Yes, authorized admin browser → GCS signed GET only. The Captain app does not read from GCS. |
| Delete | The Captain app requests deletion through the KariGO backend. After ownership/eligibility checks, the backend issues a single-key `DeleteObject`; database deletion is recorded only after success. Account deletion uses the same storage service for eligible documents. | Object key; backend service identity/authentication; backend egress IP/network and request diagnostics. | No client-side GCS delete. |

Signed URLs are **download/read only**. The backend creates them; there is no signed upload. The URL expires after five minutes, and its path embeds the object key. Once issued, the backend is not in the file-byte path between the admin browser and GCS.

### Data boundary and Play result

Google Cloud Terms define GCP Customer Data as data provided by Customer or End Users through the account. The accepted DPA makes Google a processor and limits Customer Data processing to KariGO instructions to provide, secure, and monitor the service. Google Play defines sharing to exclude transfers to a service provider acting on the developer's behalf and says a cloud provider hosting app data will typically qualify.

The Cloud Privacy Notice separately defines Service Data as account, billing, configuration/resource attributes, authentication, IP/device/token identifiers, operational status, error, quality/performance, usage, and support data, explicitly excluding Customer Data. Google uses Service Data for service delivery/operation, security and fraud/abuse prevention, diagnostics/support, analytics/measurement, recommendations, and service improvement. That independent Service Data processing does not reclassify the stored file bytes or user/document metadata as shared Customer Data.

Captain identity/application documents, vehicle documents, other application documents, and associated metadata are **collected, retained, and not ephemeral**. For the GCS transfer they are **not shared under the service-provider exception**. Applicable purposes: app functionality; account/onboarding administration; fraud prevention, security, and compliance. The admin signed-GET technical telemetry is not a new Captain-app data category because it is generated by the admin/browser and Google service request, not transmitted by the Captain app. The object key remains Customer Data where it encodes a Captain user ID and document type.

### Planned Partner path

Recommended and already implemented architecture: Partner app → authenticated KariGO backend → GCS. The backend performs `PutObject`, `GetObject`, and `DeleteObject`; reads are streamed back with `private, no-store`, and no signed Partner URL exists. This keeps authorization and file bytes server-side, supports deletion/audit, and avoids persistent public URLs. If provisioned in the same governed account, Partner onboarding files and associated metadata are **collected but not shared under the GCS service-provider exception**, retained rather than ephemeral, for functionality, onboarding/account administration, and security/compliance. This is a planned classification; production remains unchanged until the bucket, deployment, and legacy migration are separately approved and completed.

### Object-key privacy

- Captain: `captain-applications/{rawUserUuid}/{documentType}/{random}.{ext}` exposes a raw user ID and document type in the object key and signed URL. `originalName` is also copied into GCS object metadata. Names, email addresses, and phone numbers are not deliberately encoded, but a user-supplied filename may contain them.
- Planned Partner: `partner-private/vendors/{rawVendorUuid}/onboarding-documents/{random}.{ext}` exposes the raw vendor ID and purpose class. The legacy migration pattern also includes the database row ID.
- Improvement needed for new writes: use an opaque random or keyed subject namespace and random object ID, keep user/vendor/document-type relationships only in the database, and omit original filenames from provider metadata. Existing objects need backward-compatible reads/deletes or a separately approved migration. This does not block the service-provider exception, but it improves data minimization and reduces disclosure in request logs and signed URLs.

No GCS, Google Play, production, or Git remote state changed.

## Task 209B-S1-H11.2AA object-key minimization — 2026-09-30

- Local implementation for new Captain writes: `captain-private/{random-128-bit-subject}/{random-128-bit-object}.{safe-extension}`. It contains no user UUID, document type, filename, email, phone number, or name.
- Local implementation for new Partner writes: `partner-private/{keyed-opaque-vendor-namespace}/{random-128-bit-object}.{safe-extension}`. The namespace is a truncated HMAC derived with `PARTNER_PRIVATE_STORAGE_KEY_SECRET`, allowing constant-time ownership verification without disclosing the vendor UUID.
- Captain `PutObject` no longer sends original-filename provider metadata. Captain and Partner display filenames, MIME types, sizes, owners, document types, provider/bucket, object keys, deletion state, and retention state remain in KariGO-controlled database manifests.
- Existing Captain keys remain valid inputs to signed reads and deletion. Existing Partner vendor-prefixed keys remain valid only for their matching vendor; new opaque Partner keys are also cryptographically vendor-bound.
- The seven-record Partner planner now produces deterministic HMAC-derived opaque destination keys with no raw vendor UUID, database row ID, or filename. It requires the key secret and declares the manifest fields that the controlled executor must preserve.
- This is a local code/schema/migration-plan change only. Production objects were not renamed, copied, uploaded, or deleted. GCS and Google Play remained unchanged. The GCS service-provider classification remains supported.

## Task 209B-S1-H11.2AB partial provisioning evidence — 2026-09-30

- Bucket **created**: `karigo-partner-private-uploads` in project `mystical-method-475123-s9` (`My Maps Project`), under the governed Zamkah Technologies Limited account.
- Verified effective configuration: `europe-west3` (Frankfurt) regional; Standard; Public Access Prevention enabled by bucket setting; uniform bucket-level access; public status **Not public**; `allUsers` and `allAuthenticatedUsers` are restricted; Google-managed default encryption; Object Versioning off; soft delete exactly seven days; no bucket retention policy; object retention disabled; no lifecycle rules; hierarchical namespace disabled; Requester Pays off; CORS not enabled; IP filtering not configured.
- The initial policy still contains the automatically created project basic-role principals (`projectOwner`, `projectEditor`, and `projectViewer`) with legacy bucket/object roles. No public principal exists, but runtime least privilege is **not complete** until those inherited/basic-role bindings are reviewed and a dedicated Partner identity receives only bucket-scoped object access.
- Proposed runtime identity: `karigo-partner-private-storage` with bucket-scoped `roles/storage.objectUser`; no project Owner, Editor, Storage Admin, or bucket-management role.
- Cloud Storage Data Access audit logging is currently disabled for Admin Read, Data Read, and Data Write. The Console configures the Cloud Storage service AuditConfig at the project/resource level, not per bucket. Enabling Data Read/Write would therefore cover **every Cloud Storage bucket in `mystical-method-475123-s9`**, including `karigo-captain-uploads` and any unrelated buckets, and can increase logging volume/cost. The owner explicitly deferred this project-wide hardening change. No AuditConfig change was saved; the deferral is not a bucket-provisioning failure.
- No dedicated service account, bucket IAM grant, HMAC key, or `PARTNER_PRIVATE_STORAGE_KEY_SECRET` has been created. No object was uploaded. The seven-record migration, Render configuration, deployment, Google Play, Captain bucket, and Git remote remain unchanged.

Classification: **B — PARTIAL: SERVICE IDENTITY, BUCKET-SCOPED IAM, HMAC, AND APPLICATION SECRET REMAIN.** Data Access logging is an explicitly accepted project-wide hardening deferral.
