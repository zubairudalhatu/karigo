# Partner Data Safety worksheet

Audit date: 30 September 2026. Status: **PARTIAL; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Business/contact identity, address, user ID | Collected, role-required and retained | Render exempt; approved public/fulfilment identity is expected feature transfer. |
| Device ID | Session identifiers and Expo Updates telemetry; no Partner push path | Render exempt; Expo telemetry unresolved. |
| Orders/purchase history | Collected and retained | Render exempt; Customer/Captain fulfilment transfer expected. |
| Financial/payment information | Onboarding reference, payout bank account number, settlements and references retained | Partner does provide raw payout account number to KariGO. Render exempt; payment-provider flow is unresolved. |
| Product/service images | Optional/feature-dependent, uploaded to Render-local path, retained and given a public URL | Render hosting exempt; publication is intended for catalogue, but access/deletion lifecycle requires review. |
| Files/documents | Onboarding/commercial evidence collected and retained | Render/database hosting exempt; lifecycle must be documented. |
| App activity/user content | Catalogue, price, availability, order and support actions/content retained | Render exempt; intended public/fulfilment transfers apply. |
| Messages/support | Other in-app/support content only where used; no email/SMS inbox collection | Render/Resend payloads exempt; remove Email/SMS content absent evidence. |
| Diagnostics | Expo Updates/network telemetry; no Crashlytics/Sentry | Expo independent telemetry unresolved. |
| Approximate/precise device location | **NOT COLLECTED.** No dependency, permission or production code path. Business address belongs under Personal info > Address. | Remove both Partner device-location types. |

Partner uploads are not sent through the Captain S3 client. They are written to `uploads/vendors/...` on the backend and returned as public URLs. Confirm Render filesystem durability, access intent, deletion path, backups and retention before final claims.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

## Task 209B-S1-H11.2P implementation evidence — 2026-09-30

- Product, service, logo, and cover images remain intentional public content.
- New onboarding documents are written outside the static public upload root and require authenticated, vendor-scoped retrieval.
- Eligible unapproved private documents are physically deleted; approved evidence is explicitly retained as `APPROVED_ONBOARDING_EVIDENCE` without an invented period.
- Legacy public onboarding URLs and durable production private storage still require migration/verification, so historic privacy claims remain qualified.

## Task H11.2Q read-only update — 30 September 2026

- Durable private object-storage support is implemented but not provisioned. Legacy public onboarding documents are not yet inventoried or migrated. Keep public catalogue media separate and provider sharing unresolved.
