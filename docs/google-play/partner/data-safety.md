# Partner Data Safety worksheet

Audit date: 30 September 2026. Status: **PARTIAL; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Business/contact identity, address, user ID | Collected, role-required and retained | Render exempt; approved public/fulfilment identity is expected feature transfer. |
| Device ID | Session identifiers and Expo Updates telemetry; no Partner push path | Render exempt; Expo telemetry unresolved. |
| Orders/purchase history | Collected and retained | Render exempt; Customer/Captain fulfilment transfer expected. |
| Financial/payment information | Onboarding reference, payout bank account number, settlements and references retained | Partner does provide raw payout account number to KariGO. Render exempt; payment-provider flow is unresolved. |
| Product/service images | Optional/feature-dependent, uploaded to Render-local path, retained and given a public URL | Render hosting exempt; publication is intended for catalogue, but access/deletion lifecycle requires review. |
| Files/documents | Onboarding/commercial evidence collected and retained; future private GCS objects remain backend-mediated | Current Render/legacy handling remains deployment-specific. Planned governed-account GCS transfer is **not shared under the service-provider exception** after provisioning. |
| App activity/user content | Catalogue, price, availability, order and support actions/content retained | Render exempt; intended public/fulfilment transfers apply. |
| Messages/support | Other in-app/support content only where used; no email/SMS inbox collection | Render/Resend payloads exempt; remove Email/SMS content absent evidence. |
| Diagnostics | Expo Updates/network telemetry; no Crashlytics/Sentry | Expo independent telemetry unresolved. |
| Approximate/precise device location | **NOT COLLECTED.** No dependency, permission or production code path. Business address belongs under Personal info > Address. | Remove both Partner device-location types. |

Catalogue/branding uploads remain on their separate intentionally public path. New onboarding-document code uses a private backend-mediated storage service: the Partner app uploads to KariGO, KariGO writes/reads/deletes the object, and authenticated reads are streamed through the backend with `private, no-store`. No signed or permanent public URL is used for that private path.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

## Task 209B-S1-H11.2P implementation evidence — 2026-09-30

- Product, service, logo, and cover images remain intentional public content.
- New onboarding documents are written outside the static public upload root and require authenticated, vendor-scoped retrieval.
- Eligible unapproved private documents are physically deleted; approved evidence is explicitly retained as `APPROVED_ONBOARDING_EVIDENCE` without an invented period.
- Legacy public onboarding URLs and durable production private storage still require migration/verification, so historic privacy claims remain qualified.

## Task H11.2Q read-only update — 30 September 2026

- Durable private object-storage support is implemented but not provisioned. Legacy public onboarding documents are not yet inventoried or migrated. Keep public catalogue media separate and provider sharing unresolved.

## Task 209B-S1-H11.2Z planned GCS decision — 30 September 2026

- Recommended path: Partner app → authenticated KariGO backend → GCS for upload; GCS → KariGO backend → authenticated Partner for read; KariGO backend → GCS for delete.
- The implemented private-storage adapter already follows that path. It uses no signed URL and gives the Partner app no GCS credentials or direct GCS access.
- If provisioned in `My Maps Project` under the accepted Zamkah Technologies Limited DPA, onboarding files and associated metadata are **collected but not shared under Google Play's service-provider exception**. They are retained rather than ephemeral, for functionality, onboarding/account administration, and security/compliance.
- This is a planned classification; it does not assert that a Partner bucket, production configuration, deployment, or legacy migration exists.
- Key privacy: the proposed key exposes the raw vendor UUID and the generic onboarding purpose; legacy migration keys also expose a database row ID. Use opaque provider-facing identifiers for new writes and keep vendor/document relationships in KariGO's database.
- Play Console unchanged.

## Task 209B-S1-H11.2AA local minimization update — 30 September 2026

- New private Partner keys use `partner-private/{keyed-opaque-vendor-namespace}/{random-object}.{extension}`. They contain no raw vendor UUID, database row ID, business name, filename, email, phone number, or document type.
- The namespace is HMAC-bound to the vendor, preserving storage-layer cross-tenant verification. Database ownership queries remain the primary authorization source.
- KariGO's private-upload manifest retains the vendor, display filename, MIME type, size, provider/bucket, key, lifecycle state, and retention state; the onboarding record retains document type and label.
- The seven-record planner now emits deterministic opaque HMAC-derived destination keys and requires the same key secret. No file was migrated and no bucket was created.
- The planned GCS service-provider exception remains supported, conditional on provisioning, deployment, and verification.
