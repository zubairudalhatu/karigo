# Storage and payment data remediation — 2026-09-30

## Scope and safety

Task 209B-S1-H11.2P changed source, tests, a Prisma migration, and audit documentation only. It did not connect to production storage, modify production data, deploy, or change Google Play Console.

## Captain storage evidence

- Provider identity: **STORAGE PROVIDER — NOT CONFIRMED**. The code supports an S3-compatible endpoint but repository metadata does not prove a vendor.
- Configuration keys: bucket, endpoint, region, access-key identifier, secret, and path-style switch. No values were printed or recorded.
- Endpoint style: configurable; virtual-hosted or path style cannot be established without runtime metadata.
- Encryption: no explicit server-side encryption option is set by the client. Provider-at-rest defaults are not evidenced.
- Access: private application objects accessed through five-minute signed GET URLs. The implementation does not create public object URLs.
- Versioning: not visible in repository configuration.
- Key format: `captain-applications/{userId}/{document-type}/{random-hex}.{extension}`.
- Write path: `CaptainUploadStorageService.putObject`.
- Read path: authenticated Admin application lookup followed by `signedViewUrl`.
- Delete path after remediation: `DeleteObject` against one stored object key; there is no bucket-wide operation.

## Corrected deletion lifecycle

`CaptainApplicationDocument` and private `VendorOnboardingDocument` records can now record:

- `PENDING_EXTERNAL_DELETION`
- `DELETED`
- `RETAINED_FOR_DEFINED_REASON`
- `DELETION_FAILED`

Each record also captures attempt count, attempt time, a stable failure code, confirmed physical-deletion time, and an allowed retention reason. Provider errors are converted to stable messages and codes; object keys and credentials are not included in audit details.

Captain unsubmitted document removal now marks an attempt pending, calls S3-compatible `DeleteObject`, and marks the database deleted only after success. Repeating deletion after provider-confirmed absence is safe because S3 DeleteObject is idempotent. Failures remain retryable and do not set `deletedAt` or `physicallyDeletedAt`.

During Captain or complete-account deletion, unattached Captain documents are deleted before the request can become `COMPLETED`. Documents attached to a Captain application are retained with `ACTIVE_APPLICATION_EVIDENCE`. This is a defined operational state, not an invented statutory retention period. The owner/legal reviewer must decide when such evidence can be removed.

## Partner upload separation

Intentional public content remains under `/uploads/vendors/...`:

- product images
- service images
- logo and cover images

Onboarding documents now write under the non-static `private-uploads/vendors/{vendorId}/onboarding-documents/` root. Every private upload receives a database manifest before its reference is returned. The upload response supplies an opaque server-issued manifest reference. Metadata submission validates that the manifest belongs to the authenticated vendor and can be associated only once; abandoned uploads therefore remain discoverable for account deletion. Retrieval uses an authenticated vendor-owned controller route with `private, no-store` caching. Path traversal and cross-vendor keys are rejected.

Eligible unapproved onboarding documents can be physically removed through the authenticated deletion route. Approved documents are retained during account deletion as `APPROVED_ONBOARDING_EVIDENCE`; the precise legal/operational retention rule and period still require owner/legal confirmation. Legacy onboarding URLs created before this migration require inventory and controlled relocation; they are not silently claimed private by this change.

## Flutterwave minimization

New payment writes no longer persist unrestricted initialization, verification, or webhook JSON. The fixed evidence schema permits only:

- provider name
- KariGO transaction reference
- provider transaction/reference identifier
- payment method category
- success/verification flags
- amount in minor units
- currency
- event type
- evidence schema version

Nested card objects, account numbers, authorization objects, customer profiles, tokens, and unrelated provider metadata are not copied. Webhook signature verification and provider parsing remain unchanged; minimization occurs only at the persistence boundary.

### Legacy redacted inventory

Potential legacy full payload locations are:

| Table/model | JSON field | Source |
|---|---|---|
| `payments` / `Payment` | `gatewayResponse` | initialization and successful verification |
| `payment_webhook_logs` / `PaymentWebhookLog` | `payload` | verified payment webhooks, including Customer, Captain commission, and Partner onboarding paths |
| `partner_onboarding_payments` / `PartnerOnboardingPayment` | `providerResponse` | verified Partner onboarding payment |

Those blobs may contain payment-account information. No real values were inspected or exported. `services/backend-api/scripts/minimize-legacy-payment-payloads.cjs` provides a count-only `--dry-run` and a separately gated `--apply` mode. It must first be run against a restored production snapshot, with backup, row-count comparison, reconciliation sampling, and rollback validation. Task 2P did not run it against any database.

## Account-deletion inventory after remediation

The current pipeline still deactivates profiles, revokes sessions, and preserves transactional records. It does not anonymize or delete all relational personal data. Captain and private Partner objects now have explicit physical lifecycle handling, but Customer profile/order/payment/support retention and provider-side deletion remain implementation or evidence work.

Provider-side Flutterwave records are not deleted by KariGO's local account-deletion flow. Their retention/deletion is governed by the provider relationship and contract, which is still unconfirmed.

## Data Safety consequences

### Customer

New KariGO persistence no longer stores raw card/bank credential structures from Flutterwave responses. `User payment info` can be removed for new writes only after the legacy JSON cleanup is executed and verified, and after confirming no other production path receives such data. Therefore the current answer remains **NOT CONFIRMED**. Purchase history and other financial information remain collected for order, wallet, payment-reference, receipt, and reconciliation functions. Flutterwave sharing remains unresolved until the applicable contract/DPA and independent-use terms are reviewed.

### Captain

Account/document deletion statements are now consistent for eligible unattached objects. Attached application evidence is explicitly retained. Storage-provider identity and contractual role remain unconfirmed, so provider sharing cannot be finalized.

### Partner

Catalogue and branding images are intentionally public. New onboarding documents are private and authenticated. Eligible private files are physically removed; approved onboarding evidence is explicitly retained. Legacy public onboarding URLs require migration before the historic corpus can be described as private.

## Privacy and account-deletion copy review

Current copy says records "may" or "must" be retained for broad legal, finance, safety, tax, or regulatory reasons without a verified retention schedule. Do not deploy revised copy until legal/owner review. Proposed exact replacement for the website and app deletion screens:

> When your request is completed, KariGO deletes eligible profile uploads and unattached application documents from its storage. Some records may remain where a documented reason applies, including active or approved application evidence, transaction reconciliation, disputes, security, and audit records. KariGO records the reason when an item is retained. Retention periods and any provider-side records depend on the applicable record type and verified provider terms; contact KariGO for the current schedule.

The words "legal", "regulatory", "tax", and "must retain" should remain only where counsel has identified the basis and approved the schedule.

## Migration and rollout procedure

1. Back up the database and verify restore capability.
2. Deploy the Prisma schema migration with the application version that understands lifecycle states.
3. Provision a durable private upload directory or managed private object store on production. Render-local ephemeral storage is not acceptable for durable onboarding evidence.
4. Verify Captain storage credentials have object-delete permission without bucket-list or bucket-wide delete permission.
5. Run the legacy Partner upload inventory. Relocate onboarding documents into private storage, populate `storageKey`, replace public references, and verify anonymous URLs fail before deleting old copies.
6. Run the payment cleanup utility with `--dry-run` on a restored snapshot; compare counts and reconciliation behavior.
7. Obtain a separate production change-window approval, then run the gated payment cleanup and record only counts/hashes, never payloads.
8. Exercise synthetic upload/read/delete and account-deletion retries in the deployed environment before enabling completion actions.

Rollback must restore the application and schema together. Do not roll back private-document routing by making private files public. If storage deletion is unavailable, leave records in `DELETION_FAILED` and retry after recovery; do not mark deletion complete.

## Test coverage

Tests cover payment allowlisting, prohibited nested credential removal, Captain DeleteObject idempotency and secret-safe errors, Captain success/failure/retry/retention/account completion/tenant scope, Partner traversal and tenant checks, private upload classification, and failure-state persistence. Validation results are recorded in the task report/commit.

## Remaining evidence and implementation gaps

- Captain S3-compatible provider identity, region, bucket, encryption defaults, versioning, DPA, subprocessor list, and independent uses.
- Flutterwave executed contract/DPA and independent fraud, security, analytics, and improvement processing.
- Durable production design for Partner private uploads and migration of legacy public onboarding documents.
- Approved retention schedule and deletion/anonymization behavior for relational Customer, Captain, and Partner records.
- Provider-side deletion/retention evidence for Flutterwave and all other subprocessors.

## Task 209B-S1-H11.2BC legacy Partner correction — 1 October 2026

The seven historical approved Partner rows have zero recoverable legacy source objects. Six references return 404; the seventh resolves to HTML rather than an evidence file. Legacy migration is closed and the physical retained-document count for this set is **0**.

The prepared lifecycle migration marks exactly these seven guarded records `SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED` without changing approval or review timestamps. APIs hide their broken source URLs. A replacement uses the existing private GCS upload/manifest path, creates a new pending document linked to the historical row, and supersedes the historical availability state only after separate Admin approval.

## Task 209B-S1-H11.2Q rehearsal update — 2026-09-30

### Durable Partner storage target

Production target: an S3-compatible private object store configured independently through `PARTNER_PRIVATE_STORAGE_*`. Production document keys are `partner-private/vendors/{vendorId}/onboarding-documents/{random}.{extension}`. The application supplies no public ACL, requires server-side encryption (`AES256` or `aws:kms`), permits only HTTPS custom endpoints, validates ownership before every read/delete, and converts provider failures to secret-safe messages. Local storage remains available only for non-production development; the service refuses it in production.

The upload controller's existing MIME and size allowlists remain the first gate. `VendorPrivateUpload` is the lifecycle manifest. Deletion uses one explicit object key and is retryable/idempotent. Catalogue product/service/logo/cover media remains on its separate intentionally public path.

Provider decision: **D — SEPARATE PARTNER STORAGE REQUIRED, PROVIDER SELECTION PENDING**. Captain's provider was not provable from repository configuration; the Render dashboard session had expired and no safe account metadata was available. No Captain credentials, endpoint, region or bucket values were read. Reuse requires provider identity, tenant/account ownership, private-bucket configuration, DPA, subprocessors, independent-use analysis, region and encryption/versioning evidence.

### Rehearsal boundary and results

- Mock S3 rehearsal: upload command, private/no-ACL posture, encrypted write, authenticated vendor scope, read, retry after a simulated delete failure, repeated already-missing-style delete, and secret-safe errors passed. Existing account-deletion tests cover retained approved evidence; existing vendor tests cover unauthorized access and the independent public-media path.
- Restored production migration rehearsal: **NOT RUN**. No authorized restored production database was available and the local PostgreSQL service was unavailable. The guarded harness refuses database names without `restore`, `snapshot`, `rehearsal`, or `task209b` and requires a separate restored-copy token.
- Legacy Partner counts: **NOT AVAILABLE** for the same reason. The counts-only tool is prepared and never emits names, URLs, filenames, or contents.
- Flutterwave production-copy dry run: **NOT RUN**; counts remain unavailable. Synthetic fixtures proved classification, allowlisted minimization, reference preservation, idempotency, and malformed-record safety.

### Payment cleanup safety

The cleanup planner now distinguishes already compliant rows, legacy rows needing minimization, unclassifiable rows and failures. It reports only field names and structural categories for potential card/account numbers, authorization objects, customer/provider profiles, bank details and nested metadata. Dry run creates no update operations. Apply mode updates only the three allowlisted JSON columns and requires a separate controlled-window token. Records already on schema version 1 are not rewritten.

### Exact proposed copy — not deployed

`/privacy`:

> KariGO collects the account, contact, location, order, Ride/Delivery, support, uploaded-file and transaction-reference data needed for the services you use. Payment credentials entered on a provider-hosted checkout are submitted to that provider; KariGO retains payment references, status and reconciliation evidence. Private application and onboarding documents are available only through authenticated access. Catalogue, service, logo and cover media selected for publication may be displayed publicly. When an account-deletion request is completed, KariGO deletes eligible private uploads and unattached application documents. Approved application evidence, transaction, dispute, security and audit records may remain only where KariGO has recorded a defined reason. The exact schedule for each retained category is still under owner/legal review. Provider-side retention depends on the applicable verified provider terms.

`/account-deletion`:

> Submit an account-deletion request from the app or the published deletion channel. KariGO signs the account out and stops active access while the request is processed. Eligible private uploads and unattached application documents are physically deleted from KariGO-controlled storage. Some transaction, approved-application, dispute, security and audit records may remain with a recorded reason. KariGO does not yet publish a fixed period for every retained category; those periods require owner/legal approval. Deletion from a provider's systems depends on the verified provider process and contract.

Customer app deletion screen:

> Deleting your account revokes access and starts removal of eligible profile uploads and tokens. Order, Ride/Delivery, wallet, payment-reference, support, security and audit records may require deletion, anonymization or retention review. The app will show the request status; it does not promise immediate deletion of every related record.

Captain app deletion screen:

> Deleting your Captain account takes you offline, revokes access and deletes eligible unattached application documents. Documents attached to an active or approved application may be retained as application evidence until the approved schedule permits removal. Ride/Delivery, earnings, payment-reference, support, security and audit records remain subject to the documented deletion, anonymization or retention decision.

Partner app deletion screen:

> Deleting your Partner account revokes access and deletes eligible unapproved private onboarding documents. Approved onboarding evidence may be retained with a recorded reason. Public catalogue, service, logo and cover media are handled separately from private documents. Orders, settlements, payment references, support, security and audit records remain subject to the documented deletion, anonymization or retention decision.

Proposed corporate footer only; it does not determine controller status:

> © 2026 KariGO Express Limited.
> A Zamkah Technologies Limited company. All rights reserved.

No production data, deployment, Play Console state or remote Git state was changed by this rehearsal.
