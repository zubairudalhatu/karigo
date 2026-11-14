# P2.5 isolated staging foundation

Base 3da40419db3319247ad000a1ffec535b2e76b96c; branch codex/partner-ios-p2-5. Deployment evidence is pending until the new Blueprint is reviewed/applied and hosted checks pass. This is not a claim of staging readiness.

## Architecture

- New Render web service and new Render Postgres instance in the confirmed My Workspace, Frankfurt. Resource names use karigo-partner-p25; create_new planning must leave all existing resources unchanged. Automatic deploy/sync OFF. No shared environment group or Production credentials.
- Smallest paid API compute 0.5c-512mb, Postgres 0.1c-256mb with 1 GB storage, dedicated 1 GB file disk. Paid API is required for persistence. Database external IP allow list is empty; only Render private networking. No clone/import of any existing DB. Render generates independent JWT, storage-key, QA-password and operator secrets.
- P2 business source/routes/domain are unchanged. A dedicated staging launcher validates environment, dedicated database reference/name, storage roots, mock provider flags and absence of unexpected credentials BEFORE migrations or boot. A staging-only emitted-JavaScript linker resolves shared package imports into compiled output; Production build command is unchanged.
- Migrations apply only to the new referenced database. Minimal synthetic, deterministic applicant/approved/wrong-business/deletion identities and actual P2 order states are seeded. No provider Payment records, live charges/refunds/settlements/payouts or Captain dispatch. Credentials are generated environment values, never committed.
- Persistent disk: /var/data/partner-stage/private for controlled verification documents; /var/data/partner-stage/public for synthetic publicly visible catalogue images via the service-local uploads symlink. No Production object namespace/bucket/credential. Existing private file ownership/read/delete safeguards remain unchanged. Full account-erasure external evidence requirements are not bypassed.
- Mock financial, OTP, SMS, email, WhatsApp and push adapters. Staging-only HTTP guard denies external JavaScript HTTP/fetch destinations and allows loopback/self checks. This is application transport enforcement, not a claim of a provider-level network firewall. No Production secrets are available to native clients or migration processes; DB identity is pinned independently through the new Blueprint reference.
- Existing full backend is booted with a staging route allowlist; unrelated public operational/admin/provider webhook routes are unavailable. Staging account registration requires marked reserved synthetic names/email/phones. Framework/provider free-form logs are suppressed; bounded safe API status/push/audit-stage evidence contains no passwords/OTPs/tokens/bank/document payloads. Operator evidence is secret-protected. Health/readiness expose only safe environment/source/database-hash metadata.
- Partner push backend uses the P1 outbox and exact order deep-link payload, with a staging scheme marker and mock capture. Only PARTNER_STAGE_ synthetic Expo registrations are accepted today. Actual iOS APNs/Apple identity and real native device-token delivery are DEFERRED. Mock backend success is not APNs proof.
- Mobile has a staging-only banner, staging runtime and preview environment/channel separation. The profiles remain fail-closed without explicit staging URL. They will be pointed to a real URL only after hosted verification. Android Production and Partner Production iOS config remain unchanged.
- No web dashboard is required for these mobile workflows. Controlled setup uses synthetic seed and authenticated backend contracts; no production web dependency.

## Local/hosted validation design

The boot smoke uses actual HTTP/JWT/validation/Prisma/storage at the deployed process: registration/OTP verification/password proof, restricted login/draft/private upload-read-delete, pending operational denial, approved profile/catalogue/order reads, accept/preparing/ready/reject, stale/wrong-business denial, mock push/outbox/deep-link capture, sign-out revocation/device cleanup and permanent-deletion access cleanup. Outcomes contain no credentials. Tests run once for the new disk; a successful receipt is recorded on that staging disk. Fixture operations are synthetic-only. Failures do not become a PASS; inspect smoke.failed and correct before claiming readiness.

Foreground refresh remains P2's focused/active 20-second interval plus resume/push/mutation/pull refresh. Reconnect is picked up by the next bounded foreground read; no realtime or background location is added.

P3 preparation is in p3-native-checklist.md. Apple hold remains YES. No ASC app, Apple ID/provisioning, store IPA, TestFlight, OTA, Customer/Captain change or Production mutation is allowed here.

## Empty-database bootstrap findings

A full migration replay on a new empty database exposed an existing historical migration (20261001120000_task209b_partner_evidence_reacquisition) whose data guard requires seven specific Production document records. None is copied or fabricated. The staging-only migration helper accepts only that exact original normalized SQL hash and an empty users/vendors/documents database; applies/verifies its schema prefix; uses Prisma migrate resolve to record the shipped migration checksum; and resumes all remaining migrations. It does not edit the historical SQL.

The historical migration chain also differs from the P2 Prisma model in legacy defaults, truncated index names, two foreign-key delete policies, one redundant index and the obsolete ACTIVE_TEST database enum variant. The committed staging-only alignment SQL is exactly the generated model diff. It can execute only on an empty business database (no users/vendors/orders/payments/drivers/trips), must match its reviewed hash AND a newly generated diff, and must finish at zero schema drift. No Production migration, source schema or Customer/Captain application is changed. On populated staging, any new drift fails closed for review rather than auto-repairing data. All 57 original migration records/checksums remain the readiness authority.

Full-suite validation also exposed an obsolete generic-push test expectation predating P1's PARTNER_APP exclusion. Only the assertion was updated to require that existing isolation filter; notification implementation is unchanged.
