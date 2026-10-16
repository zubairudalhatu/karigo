# Governance auth, audit and approval controls — local correction

No Production deployment, migration, account, roster, email, credential, IAM or utility change is authorized or performed by this correction.

## Audit facts

`governance_security_events` is an additive append-only table. Database triggers reject UPDATE, DELETE and TRUNCATE. Application endpoints expose no event mutation. Database owners can change DDL; this is not an irreversible storage lock or a claim of protection from a hostile database owner. Restore approvals additionally require independent journal publication/readback.

Every row has an opaque UUID, event name, nullable authenticated actor UUID, nullable known target UUID, allowlisted facts and a database timestamp. Unknown/malformed/rate-limited login subjects remain null. No email, source IP, user-agent, password, challenge token, Authorization header or arbitrary exception is stored.

- `GOVERNANCE_LOGIN_FAILED`: reason `INVALID_CREDENTIALS`, `LOCKED`, `INELIGIBLE`, `INVALID_INPUT` or `RATE_LIMITED`. Existing lockout and request limits remain enforced. Default-off endpoints do not create audit state.
- `GOVERNANCE_EMAIL_LOGIN`: authenticated subject UUID.
- `GOVERNANCE_ADMIN_PROVISIONED`: authenticated operator UUID, target UUID, opaque approval reference.
- `GOVERNANCE_EMAIL_VERIFIED_AND_PASSWORD_SET` / `GOVERNANCE_PASSWORD_RESET`: target UUID; no capability/password.
- `GOVERNANCE_AUTHORITY_CHANGED`: actor UUID, affected authority, old subject UUID/null, new subject UUID/null, opaque change reference. Assignment, replacement and removal use this one event. An identical mapping is a no-op.
- `GOVERNANCE_ACCOUNT_DISABLED`: actor/target UUID and opaque reason/change reference. Re-enable is deliberately unsupported.
- `RESTORE_QUARANTINE_CREATED`: authenticated replay-operator UUID and opaque session UUID.
- `RESTORE_APPROVAL_COMMITTED`: authenticated subject UUID, authority, session UUID, stage, change reference, independent generation and digest.

## Exact routes (all under `/api/v1`)

Administrative control requires a signed, unexpired ordinary JWT whose `sub` resolves to a live, nondeleted SUPER_ADMIN. Claimed roles/headers are ignored. Governance-scoped JWTs are explicitly rejected on this control path. Both auth and provisioning flags must be true for administrative changes.

- `PUT /admin/restore-governance/authorities/:authority`: assign/change the designated UUID; explicit `subject: null` removes it. Only the four fixed authority classes are accepted. Target must be an active, verified, password-established dedicated governance identity with no business memberships. No UUID may occupy two classes.
- `POST /admin/restore-governance/accounts/:id/disable`: only a dedicated governance account may be disabled. Sets DEACTIVATED, increments credential version, consumes challenges, deletes refresh records and audits atomically. Also invalidates outstanding restore sessions by advancing roster revision.

The logical `RESTORE_RELEASE_AUTHORITY_ROSTER` for HTTP controls is held in transactional `governance_control_state`, not a caller-supplied environment/header value. No Production mapping is populated. Absent/partial mappings fail closed. The older standalone environment parser is not an HTTP authorization fallback.

All restore routes require a live governance JWT and current credential version. Roster/active identity checks repeat inside transactional control processing. No SUPER_ADMIN bypass exists.

- `POST /restore-governance/sessions`: REPLAY_OPERATOR; creates an opaque UUID session in RESTORED_QUARANTINED, bound to the configured instance/database hash/manifest digest/coverage.
- `POST /restore-governance/sessions/:id/replay-complete`: REPLAY_OPERATOR → JOURNAL_REPLAY_COMPLETE.
- `POST /restore-governance/sessions/:id/replay-verified`: TECHNICAL_VERIFIER → REPLAY_VERIFIED.
- `POST /restore-governance/sessions/:id/technical-approval`: TECHNICAL_VERIFIER → TECHNICAL_VERIFICATION_APPROVED.
- `POST /restore-governance/sessions/:id/legal-approval`: LEGAL_COMPLIANCE → LEGAL_COMPLIANCE_APPROVED.
- `POST /restore-governance/sessions/:id/executive-approval`: EXECUTIVE → EXECUTIVE_RELEASE_APPROVED.
- `POST /restore-governance/sessions/:id/release`: EXECUTIVE → RELEASED.

Only those six fixed action suffixes are accepted by the action route. Four distinct classes/UUIDs are required. No skips or self-release. A roster change invalidates unfinished sessions. The target binding comes from server configuration, never the request body.

## Durability and idempotency

A database advisory lock serializes control changes. The exact pending event (including timestamp/digest/reference) commits before external I/O. Publication requires create-if-absent and exact readback through `ReleaseAudit`; state advances only after a verified independent generation. Lost acknowledgement preserves the pending event for exact retry. Repeating a committed stage by its original, still-authorized subject returns the original result, without a second committed approval audit. History is canonicalized, chain-validated and independently read back after restart; missing historical evidence is never republished as if it had existed.

Ordinary HTTP JWT and Ride realtime validation continue to reject governance scope/role. Customer/Vendor/Captain/utility/payment/finance/user-management access is not granted by any new control.

## Default-off/runtime boundary

Effective defaults remain `GOVERNANCE_EMAIL_AUTH_ENABLED=false` and `GOVERNANCE_ADMIN_PROVISIONING_ENABLED=false`. Nothing in this task enables them. The module composes the existing `GcsReleaseAudit` through separate `RESTORE_JOURNAL_WRITER` and `RESTORE_JOURNAL_READER` dependency bindings. If either is absent, it supplies a denying provider. Nest composition is tested with separate synthetic writer/readback clients, including duplicates and missing history; tests are not Production journal certification. Approval endpoints cannot release anything with the default missing-client configuration. No runtime key, token file, impersonation permission or workload federation is invented.

Before enabling approvals, the Production dependency binding must use the approved scoped GCS writer and separate replay/reader through an explicitly verified keyless mechanism. Restore startup's separate authenticated release verifier also remains fail-closed. HTTP approval records alone do not start a restored environment or bypass replay verification. No Production authority roster or real restore target is configured here.

## Separation

The auth/control candidate includes nullable-phone compatibility, governance auth/portal, two additive auth/control migrations, immutable audit, HTTP controls, and only the pure release state machine/storage interfaces. It excludes deletion publisher/outbox migration, erasure lifecycle changes, resource-retention cleanup, checkpoint publisher and restore startup modifications. `journal-contracts.ts` is a type-only dependency, so auth does not import/start the publisher.

The pre-existing pending journal work remains a separate change set for later review/certification. Neither change set is deployed. An auth-only source snapshot must be validated independently; combined-worktree results alone are not sufficient.

## Recovery

Keep both flags off; additive tables/enum may remain unused when application code is rolled back. Do not delete/reclassify identities to restore phone NOT NULL. Reapply NOT NULL only after an explicit zero-null-row check. Audit triggers must not be bypassed for an application rollback. Any audit retention/minimization cleanup needs its own reviewed schedule/hold-aware path before the retention worker processes this new source; this task never activates cleanup.

## Final local validation — 16 October 2026

- All four local review blockers are closed: failed-login audit; audited authority mutation; audited disable/revocation; authenticated, persistent, idempotent approval HTTP routes.
- Final auth-only snapshot: 128 backend suites passed; 1,311 tests passed, 49 optional tests skipped. No failures. The opt-in governance PostgreSQL integration tests were enabled; unrelated opt-in integration suites remained skipped.
- Final combined focused checks: seven suites / 63 tests passed. This includes 51 governance/auth/approval/provider-composition checks and 12 pending journal/resource-contract checks. All external email and GCS transports were mocked.
- Backend and Admin portal typechecks passed. All configured portal regressions passed, including cookie isolation, CSRF and logout.
- Fresh local migration rehearsal from the pre-change schema, without the pending journal migration, passed. Foreign-key update behavior and quoted challenge-index name were corrected. Read-only Prisma migration/schema diff: **No difference detected**.
- Final credential-pattern scan and staged diff check passed. No native/Customer app config, lockfile or dependency version was changed.
- Testing used the workstation's existing Node 24.18.0; Production Node configuration remains unchanged. Remote CI has not been triggered because nothing was pushed.
- No Production deployment, migration, user/role/roster change, real email, service key or credential creation occurred. No cloud storage/resource/IAM operation occurred in this task. Worker inactive, real exports disabled, journal unlocked and App Privacy unsaved.

READY_FOR_DEFAULT_OFF_PRODUCTION_DEPLOYMENT_REVIEW = YES

No local blocker remains for reviewing the inert auth-only commit. This is not approval for deployment or enablement. Before real approval/restore operation, separately bind and verify the approved keyless writer/reader identities, integrate the authenticated restore-startup release verifier, approve/provision the real humans and mapping, and review the new audit source's retention/hold-aware operational cleanup. Missing bindings/mapping keep release fail-closed. Production journal certification and retention-worker activation remain blocked.
