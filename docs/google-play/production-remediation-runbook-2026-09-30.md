# Production storage and payment remediation runbook — 30 September 2026

Status: **PREPARED, NOT AUTHORIZED FOR EXECUTION**. Use a separate approval at every gate. Never put credentials or record values in the evidence log.

## Global prerequisites

- Approved maintenance window, named operator/approver, incident channel and rollback owner.
- Tested database backup/restore and object-source backup.
- Release built from the approved commit, reviewed diff and passing validation.
- Provider/DPA evidence complete; private bucket blocks anonymous access, uses encryption, scoped credentials and tested versioning/lifecycle.
- A fresh production-copy rehearsal with aggregate before/after evidence.

## Phase A — provision durable private storage

- Prerequisite: provider accepted and bucket policy reviewed.
- Action: provision private bucket; generate and durably retain a dedicated high-entropy `PARTNER_PRIVATE_STORAGE_KEY_SECRET` in the deployment secret store; set `PARTNER_PRIVATE_STORAGE_DRIVER=s3` and the approved `PARTNER_PRIVATE_STORAGE_*` values; deploy the compatible application with Partner private upload actions disabled until verification. Never reuse the storage access key as the object-key HMAC secret, and do not rotate the HMAC secret without a versioned compatibility plan for existing keys.
- Success: synthetic upload/head/authenticated read/delete succeeds; anonymous and cross-vendor access fails; no ACL/public URL; audit contains no secret.
- Stop/rollback: disable Partner private uploads and restore prior app release; keep copied objects private. Never switch to public storage.
- Evidence: redacted config names, policy/config screenshots, test IDs/counts and timestamps.

## Phase B — apply database migration

- Prerequisite: fresh backup and successful restored-copy rehearsal using `CONFIRM_TASK209B_RESTORED_SNAPSHOT=AUTHORIZED_RESTORED_COPY`, `TASK209B_REHEARSAL_DATABASE_URL=<restored database URL>`, then `node services/backend-api/scripts/rehearse-storage-lifecycle-migration.cjs`.
- Action: run the repository's approved Prisma deployment command against production only after a separate action-time approval: `npm exec --workspace @karigo/backend-api -- prisma migrate deploy`.
- Success: migration `20260930150000_task209b_storage_lifecycle` applied, constraints/indexes valid, core counts unchanged, existing rows readable.
- Stop/rollback: stop on any unexpected destructive SQL, count drift or constraint failure. Restore database/application together if forward repair is unsafe; preserve new private objects.
- Evidence: migration table result, aggregate counts, runtime and warning codes.

## Phase C — migrate legacy Partner private documents

- Prerequisite: approved restored-copy inventory and reviewed per-object plan.
- Action: first run `node services/backend-api/scripts/inventory-legacy-partner-files.cjs --dry-run` and, with the deployment `PARTNER_PRIVATE_STORAGE_KEY_SECRET`, `node services/backend-api/scripts/prepare-legacy-partner-file-migration.cjs --dry-run`. Confirm every destination key matches `partner-private/{opaque}/{opaque}` and contains no vendor UUID, database row ID, or filename. For each approved object: copy, head/size/hash verify, create/link the full provider/bucket/metadata/lifecycle manifest, switch reference, verify owner access and unauthorized rejection, remove public source, record completion.
- Success: every eligible item has a verified private object/manifest; anonymous old URL fails only after verified switch; aggregate category counts reconcile.
- Stop/rollback: stop per object on any mismatch. Before source removal restore old reference; afterward recover from backup into private storage. No bulk blind deletion.
- Evidence: aggregate status counts and opaque migration IDs only.

## Phase D — verify private access and deletion lifecycle

- Prerequisite: phases A–C complete for a controlled sample.
- Action: exercise upload, replace, authorized read, cross-vendor/anonymous rejection, eligible deletion, simulated retry, repeated delete, retained-approved evidence and public catalogue rendering.
- Success: all checks pass; DB state matches physical object state; retained evidence remains; public media is independent.
- Stop/rollback: disable completion actions on any physical/DB mismatch and repair before resuming.
- Evidence: test names, timestamps, aggregate outcomes and stable failure codes.

## Phase E — production Flutterwave cleanup dry run

- Prerequisite: backup and owner-approved read-only window.
- Action: `node services/backend-api/scripts/minimize-legacy-payment-payloads.cjs --dry-run`.
- Success: counts for inspected/compliant/needs-minimization/unclassifiable/failures and field-name structural categories; zero writes; no values in logs.
- Stop/rollback: stop if any output contains values/PII, query load is unsafe, or unclassifiable/failure counts are unexplained.
- Evidence: sanitized aggregate output and backup identifier.

## Phase F — owner approval

- Prerequisite: phases A–E evidence reviewed; reconciliation sampling plan and rollback approved.
- Action: obtain explicit action-time approval for the exact count and backup.
- Success: written approval identifies commit, database, time window and operator.
- Stop: no approval means no apply.
- Evidence: approval reference.

## Phase G — execute legacy payment cleanup

- Prerequisite: Phase F and fresh unchanged dry run.
- Action: set `CONFIRM_PAYMENT_PAYLOAD_MINIMIZATION=TASK209B-CONTROLLED-WINDOW` in the one-off process only, then run `node services/backend-api/scripts/minimize-legacy-payment-payloads.cjs --apply`.
- Success: only legacy rows in `Payment.gatewayResponse`, `PaymentWebhookLog.payload`, and `PartnerOnboardingPayment.providerResponse` update; references/reconciliation work; rerun plans zero updates.
- Stop/rollback: stop on count drift, malformed-row writes, reference loss or reconciliation failure. Restore affected JSON columns from the encrypted backup using primary keys; do not blanket-restore unrelated tables.
- Evidence: before/after hashes/counts, update count, reconciliation checks and rerun result.

## Phase H — post-change verification

- Prerequisite: phase G complete.
- Action: run focused and full regression suites, production-copy audit, object lifecycle sample, Data Safety evidence review and monitoring.
- Success: no error-rate regression, all lifecycle states reconcile, Customer legacy payment-instrument structures are absent where proven, and no secret/PII appears in evidence.
- Stop/rollback: disable affected write/deletion path and use phase-specific rollback on any integrity issue.
- Evidence: test report, monitoring window, final aggregate inventory and owner sign-off.

## Task 209B-S1-H11.2R infrastructure gate — 2026-09-30

Read-only Render evidence confirms the production backend is `karigo` in Frankfurt on Starter, deploy branch `main`, with auto-deploy off. The live deploy is `de3bbdccf17570bbeead4b18b3e9413d50048f74`. A manual deploy runs `npx prisma migrate deploy` before starting the application. Pushing Git alone therefore does not migrate or deploy the Render backend.

The attached database is `karigo-staging-db`, PostgreSQL 18, paid `basic_256mb`, 1 GB, Frankfurt. Its legacy name does not make it non-production; it shares the production Render environment. Do not use or rename it as a rehearsal target.

Before Phase B, follow `snapshot-rehearsal-environment-2026-09-30.md`. The Recovery page confirms a seven-day PITR window and a latest inspected point of `2026-09-30 20:26:12 +01:00`. Preferred method remains a fresh logical export restored into `karigo_task209b_rehearsal_20260930`, a separate Frankfurt PostgreSQL 18 database with no production service attachment. The minimum inspected temporary configuration is `0.1c-256mb` plus 1 GB at $6.30/month, prorated by the second. The workspace/environment `0.0.0.0/0` rule must be resolved before treating the destination as network-restricted.

Push gate: a push to `main` would automatically create Vercel production deployments for the website, admin portal and vendor dashboard. It would not auto-deploy Render, run Prisma migration, create an EAS build/update, or invoke GitHub Actions. Treat Git push as a production web deployment and obtain separate approval.

Captain storage is **A — definitively Google Cloud Storage**, proven by the `storage.googleapis.com` XML/S3-compatible endpoint. Production uses bucket `karigo-captain-uploads`, region `auto`, path-style addressing and enabled storage. Bucket IAM/public-access prevention, location, encryption-key mode, versioning, soft-delete/lifecycle and account contract evidence remain rollout gates. Partner recommendation is **A — reuse Google Cloud Storage with a separate private Partner bucket**, pending those gates and provisioning approval.

## Task 209B-S1-H11.2X GCS provisioning gate — 2026-09-30

Captain baseline from read-only inspection: `us-south1` (Dallas), Standard, uniform access, Google-managed key, no public IAM, PAP not enforced, soft delete seven days, versioning off, no lifecycle rules, no retention/object lock, Requester Pays off, and Cloud Storage Data Access audit logs disabled. Do not copy these weaknesses into Partner.

Phase A proposed Partner controls:

- separate bucket `karigo-partner-private-uploads` in `europe-west3` (Frankfurt), subject to owner/legal location approval;
- Standard class, Public Access Prevention enforced at creation, and uniform bucket-level access;
- dedicated bucket-scoped runtime identity using `roles/storage.objectUser`; temporary migration identity revoked after the seven-record run; no public or broad project-basic-role object access;
- Google-managed encryption unless a documented requirement selects CMEK;
- seven-day soft delete, Object Versioning off, no bucket/object lock, and no lifecycle deletion until the approved-evidence retention duration is decided;
- no CORS unless a tested browser flow requires an exact-origin allowlist;
- authenticated backend retrieval or short-lived signed URLs, single-key deletion, absence verification, and opaque deterministic keys;
- enable Cloud Storage Data Read and Data Write audit logs before production use; retain Admin Activity logging; and
- keep public catalogue/service/logo/cover media outside the private document bucket.

Additional pre-provisioning gate: the project Privacy & Security page still offers `Review and Accept` for the Cloud Data Processing Addendum. Preserve an account-specific acceptance/executed agreement record identifying Zamkah Technologies Limited, the governed account/billing account, timestamp, and version before relying on the service-provider exception. Provisioning, DPA acceptance, Captain PAP/IAM/logging changes, secret configuration, migration, and deployment each remain separate approval actions.
