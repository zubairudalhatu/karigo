# Retention continuation and operational release gate

Policy: KGO-RETENTION-2026-10-15. This document does not authorize cleanup, worker activation, new infrastructure, signing credentials or App Privacy submission.

## Dry-run reporting

`npm run retention:dry-run` reports every registered source, including zero counts, and follows immutable timestamp/UUID cursors until exhausted. It never persists reporting cursors. Each page is bounded to 500 records; a 1,000-page ceiling reports `complete: false` and the remaining source names. An incomplete report must not be treated as zero eligible records. Counts have one fixed `asOf` instant, but the report is not a database-wide historical snapshot; activity during a report can change row counts.

UserLoginActivity, ordinary AdminAuditLog and VendorAuditLog use `createdAt` plus 24 calendar months. Completed Customer-erasure Admin audit entries use their separately approved seven-year deletion-audit rule. Record-scoped holds and registered case deadlines override ordinary expiry. Timestamp/id ordering handles identical timestamps and rows disposed on an earlier page. Financial accounting uses 31 December year-end in Africa/Lagos, not UTC. Security/support retention uses elapsed calendar months from the recorded event/closure instant, not a financial-year boundary.

Sponsored-event reporting uses complete database counts rather than a 500-event sample. Receipts, support sources, financial sources, hold exclusions and overdue hold reviews appear in the aggregate output. No row IDs, contact data, URLs or credentials belong in this report.

## Temporary exports: actual storage and limits

The current Ride finance CSV is generated in memory and downloaded through an authorized Admin browser. It contains Captain name and financial/ride references. The daily launch CSV and SME pilot report are also response/browser downloads. No persistent server export writer calls `TemporaryPiiExports` in the current application. A browser download cannot be remotely erased by the backend after 30 days.

The registry-wide export dry-run therefore reports actual registered/due/held counts even without `RETENTION_EXPORT_DIRECTORY`, but explicitly reports that the directory is unconfigured and unmanaged downloads are not verified. Zero registry rows is not proof of zero staff copies. Do not invent a directory, scan arbitrary server/staff files, or classify staff devices as approved archives.

The filesystem manager is ready for a separately approved absolute export root. New objects have creation/expiry registration, an opaque UUID filename, restrictive POSIX create modes, and a hash binding the registry row to the exact real root. Cleanup only touches that bound registered file; legacy/unbound records require review. A DataRetentionResource hold excludes it. `disposedAt` records idempotent disposal, including a previously removed file. Symlink roots/targets are rejected. Unlink is not a claim of physical-media overwrite or backup erasure. Windows ACLs, inherited directory access and the actual mounted storage still require deployment/operator verification.

Minimum next export decision: either approve an encrypted, centrally controlled export store/root with named custodian and lifecycle/hold implementation, or discontinue persistent/downloaded PII exports. For existing staff downloads, register creation date, accountable custodian, approved location and deletion/hold attestation; maximum 30 days from creation unless an approved hold applies. Do not replace an unknown creation date with filesystem mtime. This task does not delete those copies or alter existing export routes.

## Independent deletion journal: proposed, not created

The owner confirms there is no approved independent journal/runbook today. Production deletion audit in the same database is insufficient because a restore can rewind it.

Proposed location: a new dedicated private GCS compliance-journal bucket in an independently administered recovery/security project. This is a design recommendation, not an assertion that the bucket/project exists. Do not reuse business-upload or ad-creative buckets. Approval is required before resource, IAM or key creation.

* Store only opaque User/Customer IDs, deletion reference, completion time, policy/erasure version, surviving-role flag and non-personal cleanup-evidence reference. No name, email, phone, address, token, credential or financial payload.
* Retain minimum journal evidence for the already approved seven years from deletion completion, with individually approved holds. This is a compliance record, not a 90-day full-database archive; backup copies of the journal still follow the applicable backup limits. Do not extend it indefinitely for convenience.
* Commit a journal outbox entry atomically with completion. A separately operated publisher writes append-only journal events, sequence numbers and previous-event hashes; a completeness watermark advances only after durable acknowledgement. Backfill existing completed deletions only under a separately reviewed plan. Reconcile event counts/watermarks and alert on gaps.
* Use encryption at rest and TLS; recommend a separately controlled Cloud KMS asymmetric signing key for manifests/checkpoints, with signatures verified against a pinned public key. The present local HMAC test interface is a rehearsal primitive, not an already deployed KMS integration. Key rotation, custody and recovery must be approved; no key has been created here.
* Separate roles: application/outbox publisher has only necessary append permissions; recovery operator can read/verify/decrypt but not rewrite the journal; Legal/Compliance authorizes record holds/releases; a separate retention custodian performs policy expiry. Security/DR lead owns the runbook, watermark monitoring, incident escalation and rehearsal sign-off. Name the actual people before activation.
* Keep journal access, hold changes, checkpoint verification, expiry and restore-release approvals auditable outside the restored database. Object overwrite/delete prevention and lifecycle configuration must be designed together so approved seven-year expiry remains possible. Do not lock a bucket irreversibly without explicit approval.

## Restore runbook and operational release

1. Provision a fresh isolated target with public routing, purchases, email/push dispatch and scheduled jobs blocked. Do not restore Production in place or point any live service at the target.
2. Provision it through an approved template that forces `RESTORE_ISOLATED=true`; absence of that flag is currently a deployment-control gap, since ordinary application startup intentionally remains unchanged.
3. Restore the chosen backup. Obtain the independent journal through a verified coverage watermark through the cutover/release instant, including deletes after the backup timestamp. Verify no outbox gaps, signature, policy, monotonic sequence, exact target database identity and unique restore-instance binding. A backup-time journal alone is insufficient.
4. Replay erasure/minimization before Nest listeners/modules/workers start. Preserve scoped holds, surviving legitimate roles, minimum financial facts and processor cleanup markers. Never vend, adjust wallet numbers, resend completion notices or restore receipt capabilities.
5. Verify deleted Customer access and ordinary PII remain absent, receipt expiry, scoped holds, financial integrity and idempotent second replay. Processor markers are evidence references, not proof that a remote processor has been erased again. Reconcile remote cleanup/expiry where necessary.
6. Advance/replay through the latest journal watermark, then obtain separate Security/DR and Legal/Compliance release sign-off. Only the controlled provisioner may release network quarantine. Retain target-bound replay results and release evidence; a copied or stale success marker must not suffice.

The code gate fails startup before listening when `RESTORE_ISOLATED=true` and required authenticated evidence/replay fails. That conditional gate does not prove every externally created service is automatically isolated. The independent journal, KMS integration, deployment template, operator roles and release process remain implementation/approval requirements.

## Activation conditions

Do not activate retention until complete deployed dry-runs, export custody/expiry controls, hold-authorizer operations, durable disposal audit, restore-journal coverage and quarantine/release controls are verified. Local synthetic test success is not Production operational rollout evidence. Do not save App Privacy while specific dormant-SDK collection/tracking questions remain unresolved.
