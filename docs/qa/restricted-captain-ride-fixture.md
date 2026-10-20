# Restricted Captain Ride QA — predeployment review

Local backend-only capability. No migration, mobile build or OTA is required. Deployment and enabling the window require separate authorization.

## Authorization and configuration

All controls below are under `/api/v1/admin/taxi/internal-qa`. They require an authenticated ADMIN/SUPER_ADMIN, with a fresh database check for ACTIVE and not deleted. No request body supplies a Captain, Customer, fare or test flag.

- `POST /`: create the single fixture while Captain is offline and has no work.
- `GET /:tripId`: inspect lifecycle and financial residual counts.
- `POST /:tripId/offer`: attempt the one bound offer/push; never blindly retry ambiguous delivery.
- `DELETE /:tripId`: clean/retire that exact fixture, including after the flag is OFF.

Server configuration defaults closed:

- `CAPTAIN_RIDE_QA_ENABLED=false`
- `CAPTAIN_RIDE_QA_WINDOW_ID` unset; enabling requires a fresh UUIDv4.
- `CAPTAIN_RIDE_QA_CAPTAIN_IDS=[]`; enabling requires exactly `["226d2334-1df4-47ad-bac4-08cdde0e5f4a"]`.

The Captain UUID was read from the approved existing reviewer evidence. An immutable Admin audit registry binds generated fixture/marker IDs, the Captain, disabled synthetic Customer FK holder and a two-hour expiry. A PostgreSQL advisory lock serializes creation. Each window is consumed once, including after cleanup. The registry, rather than client-visible isTestMode or fare, controls the financial fences.

## Controlled sequence after separate approval

Recheck Captain ACTIVE/approved, offline/no work, and exactly one active iOS/Expo/RIDER_APP push registration. Enable only the approved window, create, then have that Captain go online and offer once. Use existing Captain accept/pickup/start/destination/complete APIs. Coordinates are public synthetic user-supplied waypoints, not Google content; route distance/time remain unavailable. Geofence override, if required because the tester is not physically at those public coordinates, uses the existing explicit audited override.

Completion takes the normal lifecycle transition/work-lock path but exits before minimum-fare, waiting-charge, settlement, receipt and earnings logic. Separate guards reject direct settlement/closed-outcome/receipt-email attempts. Normal Ride pricing and financial behavior retain their existing tests.

Only the assignment notification to the approved iOS device is permitted. No Customer, other Captain, email/SMS/WhatsApp or provider call is permitted. The existing in-app call screen requests microphone permission before contacting the API. The synthetic API then returns `INTERNAL_QA_NO_NETWORK_CALL` without an Agora token/session or engine join. This permits permission allow/deny/recovery testing; it does **not** certify a real Agora call or media connection.

Run authenticated cleanup even if the test aborts. It verifies zero settlement/ledger/receipt/email records, returns the bound Captain offline, clears work/location state and deletes disposable fixture/FK/trace/call/notification rows. Minimal security audit remains. Financial residuals or changed bindings block deletion; quarantine stops the bound synthetic work where safe and reports the problem. Never delete financial evidence to make cleanup pass.

After cleanup, explicitly set `CAPTAIN_RIDE_QA_ENABLED=false`, reread live configuration, verify no trip/work/location/notification/financial residuals and confirm creation is rejected. The server does not edit its hosting environment itself. No Production QA certificate may be issued until this postcheck is complete.

## Scope

No changes to schema, migrations, payment/provider configuration, utilities, retention/governance, Customer submission, or Captain Android/mobile sources. Tests mock notifications and provider activity. Physical lifecycle validation remains a separate postdeployment task.
## Local validation (2026-10-20)

- Focused fixture/security/financial-negative tests: 33 passed.
- Final fixture + communication regression run before cleanup-readback extension: 46 passed.
- Full backend: 132 suites passed; 6 skipped; 1,387 tests passed; 98 skipped; zero failures.
- Captain regression, location and waypoint scripts: passed.
- Customer/Ride regression scripts: passed.
- Backend, Captain and Customer typechecks: passed.
- Backend build/runtime import verification: passed (repeated after final cleanup-readback extension).
- Prisma schema validation: passed using a non-secret local placeholder URL; no database connection/migration performed.
- Credential-pattern scan: zero matches; git diff whitespace check passed.

Concurrency tests serialize the mock transaction harness and check use of the PostgreSQL advisory lock; no live PostgreSQL race or physical-device lifecycle was executed in this local-only task. Production deployment, enabling flags, fixture creation, notification delivery and cleanup certification remain unperformed.

## Placeholder phone correction (local review)

The placeholder phone is `INTERNAL_QA_` followed by the window UUID's 32 hexadecimal digits encoded injectively as letters A–P (hex 0→A, …, f→P). It is deterministic per window, unique across distinct windows, contains no dialable digits, and normal phone normalization produces an empty string. It satisfies the existing text/non-null constraint without reserving or impersonating a Nigerian number. The identity remains DEACTIVATED, unverified, email-less, and has an invalid non-login password sentinel. There is one disposable identity per one-fixture window; no shared persistent Customer is introduced.

Cleanup now requires the exact window-derived phone as well as the immutable identity binding and disabled/sentinel checks. A changed phone causes transactional rollback/quarantine. All QA Ride viewer representations redact the phone; existing synthetic contact options already disable phone fallback. Ordinary registration/auth, phone uniqueness, migration SQL and normal Ride pricing/finance are unchanged.

### PostgreSQL regression reproduction

Use an empty, disposable PostgreSQL database named exactly `karigo_qa_placeholder`, bound to `127.0.0.1`. Populate it from the current Prisma schema using an explicitly local DATABASE_URL and `prisma db push --skip-generate`. This is test setup only; never run it against Production.

Set `INTERNAL_QA_TEST_DATABASE_URL` to that loopback database, then run:

```
npm test --workspace @karigo/backend-api -- --runTestsByPath src/modules/taxi/internal-ride-qa.postgres.spec.ts src/modules/taxi/internal-ride-qa.spec.ts
```

The test never falls back to DATABASE_URL. It checks host/database identity and requires an empty user table before taking ownership of test cleanup. It installs the exact existing `governance_email_phone_required` CHECK statement read from the shipped migration into this local schema. Real service creation and cleanup run against PostgreSQL. NULL ordinary phones fail, valid ordinary Customer registration/uniqueness remain intact, synthetic login/OTP validation and notification guards reject the placeholder, no provider is called, and the CHECK definition is compared unchanged after cleanup. Without the explicit test URL this integration suite is skipped; the deployment-review evidence must include an explicit passing run.

### Correction validation

Validated locally on 2026-10-20 with native PostgreSQL 18.4 bound only to loopback:

- Focused fixture + PostgreSQL: 49/49 passed (15 PostgreSQL checks).
- Full backend, with PostgreSQL integration explicitly enabled: 1,403 passed; 98 skipped; zero failures.
- Existing Taxi service/pricing: 48 passed; Ride finance: 21 passed; Auth service: 23 passed.
- Captain regression/location/waypoint and Customer/Ride scripts: passed.
- Backend typecheck/build/runtime-import checks: passed.
- Credential-pattern matches: zero; diff whitespace check: passed.
- No schema/migration/auth/mobile/provider configuration changes; no Production access or deployment performed for this correction.
