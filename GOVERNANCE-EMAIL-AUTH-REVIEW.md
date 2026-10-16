# Dedicated email-only restore-governance Admins - local review gate

No Production account, migration, deployment, authority mapping or new email is created by this implementation task. Owner confirmed actual receipt of exactly one verification message in each of the four approved mailboxes.

## Proposed authentication and permission boundary

- New limited `AdminRole.RESTORE_GOVERNANCE`; never SUPER_ADMIN.
- Real `users.id` UUID remains the JWT `sub`; no synthetic mobile number or email-as-phone substitution.
- `users.phoneNumber` becomes nullable only when a database CHECK permits an email-bearing ADMIN with this dedicated role. Customer, Vendor, Rider and ordinary Admin records still require a phone. Existing mobile DTOs and endpoints are unchanged.
- Independent Admin-email identity and hashed, expiring SETUP/RESET capabilities. First setup establishes email verification and the individual's password before activation. Challenges are single-use and expire after 30 minutes. Password reset invalidates earlier sessions and challenges.
- Passwords are bcrypt-hashed; raw challenge tokens only pass through the individual's email and one HTTPS form. Setup links use a fragment removed from browser history on load. No setup/reset token or password in logs, audit facts, Git, browser storage or API responses. Access JWTs are handled by the server-side portal session and stripped from browser responses.
- Governance JWTs are scoped, expire after 15 minutes, carry a credential version, and have no refresh token. Logout invalidates the individual's outstanding sessions.
- Ordinary HTTP JWT validation and Ride WebSocket authentication reject the dedicated role. Governance login cannot be used for Customer/Vendor, operations, wallet, utility, finance or staff administration routes.
- Separate portal sign-in option and limited landing page. Tokens stay in HttpOnly server cookies; no operations navigation or restore action is unlocked by sign-in.
- Missing authority roster continues to block release. Signed subjects must also match a live verified dedicated identity and its current credential version. Four distinct authority UUIDs remain separately approved configuration.

## Default-off configuration for later review

`GOVERNANCE_EMAIL_AUTH_ENABLED=false` and `GOVERNANCE_ADMIN_PROVISIONING_ENABLED=false` are the effective defaults. No Production configuration was changed.

Later approved deployment must configure the existing verified Resend sender/credential and `ADMIN_PORTAL_ORIGIN` as an HTTPS origin; no new email domain or credential is proposed. Provisioning has no public registration route and requires an authenticated active Super Admin operator, explicit mailbox-receipt confirmation and an opaque approval reference. That operator creates pending dedicated identities only and writes creation audit records. No Customer/Vendor membership is created.

A lost/ambiguous setup-email acknowledgement invalidates that capability and leaves the account pending. No blind mail retry is performed. Any recovery/resend requires a separately controlled operator action; it must not create another identity.

## Review before provisioning

1. Review nullable-phone constraint and additive identity/challenge tables; rehearse migration and collision/rollback behavior with synthetic records only.
2. Review default-deny HTTP/WebSocket/session boundaries and short-lived credential-version checks.
3. Review the individual email setup/reset UX, cookie isolation, CSRF protection, brute-force lockout and challenge cooldown.
4. Approve a specific source commit/deployment and enablement separately. Implementation alone does not authorize Production provisioning.
5. Only after reviewed deployment, provision approved humans using the individually verified mailboxes; complete individual setup without passwords, links or OTPs in chat.
6. Return verified new UUIDs. Do not assign `RESTORE_RELEASE_AUTHORITY_ROSTER` until the owner separately approves that mapping.

The previous proposed Customer/Vendor/reviewer UUIDs are not converted or reused. Production restore release remains fail-closed; worker inactive; journal unlocked; real exports disabled; App Privacy unsaved; utilities unchanged.

## Validation evidence

- Full backend regression run: 127 suites passed; 1,296 tests passed, 53 skipped. No failures in the fresh run.
- Configured Admin portal regression checks: all passed, including executable governance HttpOnly-cookie/token-stripping/CSRF/logout tests.
- Backend and Admin portal typechecks passed. Final checks after the additional recovery cases are recorded in the closeout below.
- Actual migration SQL rehearsed successfully on `127.0.0.1:55439/karigo_governance_qa_20261015`, created from the preceding schema. No Production connection or migration.
- Local browser review: existing mobile login remains; governance email/password mode and password-reset request form render correctly. No sign-in/reset form was submitted to Production.
- Governance-scoped tokens remain rejected by ordinary APIs and Ride realtime even after a later account-role change.

The test runner uses Node 24.18.0 on this workstation; the configured Production Node major remains unchanged. No package versions or lockfile changes were made. The new workflow has not been deployed or exercised with any real authority account.

Focused final governance validation: 2 suites, 22 tests PASS, including explicit setup recovery with no automatic retry. All mail was mocked. Synthetic PostgreSQL server stopped after verification.

## Final review gate

Final backend and Admin portal TypeScript checks: PASS. Configured portal regressions: PASS. Diff check: PASS. Limited credential-pattern scan across 47 changed/new source, test, migration and evidence files: zero findings. The local browser preview and synthetic database server are stopped.

READY_FOR_CODE_REVIEW = YES
READY_FOR_PRODUCTION_ACCOUNT_PROVISIONING = NO

No Production Admin account, UUID, mailbox setup email, role change, authority roster, migration, deployment or feature enablement was performed. No Production Customer/financial data was accessed or mutated by the implementation/tests. No additional real email was sent. Existing safety gates remain unchanged.

Next step is review of the source/migration/session boundaries and approval of a concrete deployment/enablement plan. Provisioning remains separately gated; the four real humans' new UUIDs do not exist yet.

## Conditional predeployment review outcome

REVIEW = FAIL. Production deployment is not authorized by the conditional gate until these findings are closed:

- Failed governance login returns/lockout increments do not append an audit event (governance-auth.ts login).
- Authority roster assignment/change has no implemented audited mutation workflow; environment parsing alone does not provide the required change audit.
- Governance-account disablement has no demonstrated dedicated audited lifecycle path.
- RestoreReleaseSession and GcsReleaseAudit provide local approval primitives, but there is no deployed/authenticated restore-approval endpoint integration to certify or include in the capability allowlist.
- The pending worktree includes journal lifecycle/outbox changes as well as email auth. A deployment candidate must explicitly review/package that combined scope or isolate the auth migration/code safely.

Existing test results remain useful but do not establish the missing audit/integration requirements. No source commit, push, Production deployment, migration, account creation, email, feature enablement or roster assignment was performed during this review.

Effective code defaults: GOVERNANCE_EMAIL_AUTH_ENABLED=false; GOVERNANCE_ADMIN_PROVISIONING_ENABLED=false. Live environment values were not independently inspected in this review.

Current HTTP auth allowlist (under the configured API prefix): POST auth/admin-email/login; POST auth/admin-email/password-reset/request; POST auth/admin-email/password/complete; GET auth/admin-email/me; POST auth/admin-email/logout. Only me/logout consume governance sessions. Provisioning/reissue are internal service methods, not public endpoints. No restore-approval HTTP route is currently exposed.

Recovery: keep both flags off and roll back application code if required. Additive tables/enum may remain unused. Restore phone NOT NULL only after checking that no nullable governance rows exist; never delete/reclassify an identity merely to roll back schema. Enum removal requires a separately reviewed migration and is not an automatic rollback action.

READY_FOR_CONTROLLED_GOVERNANCE_ACCOUNT_PROVISIONING = NO

## Superseding local correction review — 16 October 2026

The four implementation findings above are now corrected and tested in the isolated auth-only candidate. See `GOVERNANCE-CORRECTION-CLOSEOUT.md` for exact audit events, endpoint/capability allowlist, default-off composition and remaining operational enablement gates. Final results: 1,311 backend tests passed / 49 optional skipped; 63 focused governance/journal checks passed; backend/portal types, portal regressions, fresh migration/schema equality and staged diff/credential checks passed.

READY_FOR_DEFAULT_OFF_PRODUCTION_DEPLOYMENT_REVIEW = YES

No deployment or Production account/roster/email/configuration change occurred. Production journal runtime bindings/startup release verification and real authority provisioning remain separate, fail-closed gates; no Production certification or enablement is claimed.
