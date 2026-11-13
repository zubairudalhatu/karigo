# Partner iOS P2 — mobile merchant order operations

Base: 1e4b19849e948cd029fd819a1c72b11f25386cf3. Branch: codex/partner-ios-p2. This is local development and synthetic/contract validation only. P1 history is preserved. No Production, Apple registration/submission, native build, TestFlight, OTA or Squad migration occurred. Customer and Captain application trees are unchanged.

## Supported scope

The authoritative matrix is in p2-order-state-matrix.md. PAID/VENDOR_CONFIRMING can be accepted or rejected; VENDOR_ACCEPTED can start preparation; PREPARING can be marked READY_FOR_PICKUP. Merchant controls end there. Handoff, dispatch, delivery completion and customer/admin-owned transitions have no mobile controls or matching merchant endpoints. DELIVERED/COMPLETED and cancelled/rejected/failed/refunded states are history only. No new states, options field, fulfilment selector or pagination contract was invented.

Mobile now supplies an explicit confirmation and the server status/update timestamp for all four actions. Rejection uses the existing six reason codes and optional validated 500-character business note. Preparing items, quantities, preparation notes, safe totals, payment/COD state and history are displayed. Customer name/phone are masked; only delivery city/state is returned, not address, delivery instruction, OTP, customer IDs, gateway metadata, credentials or internal audit notes. The general customerNote is withheld because the existing field can contain delivery-sensitive content; item preparation instructions remain available. Refund review is explained without refund execution or payout controls.

List groups map to actual states. Loading, empty/error/retry and pull-to-refresh are included. A failed read leaves cached data explicitly read-only; authorization/ownership failures remove it. Caches, duplicate-notification claims and confirmations are memory-only. No irreversible offline queue or optimistic success is used. A lost POST response requires authoritative refresh before a new explicit confirmation, never automatic replay. Writes pin the confirming access token and refuse an account-generation change; reads can use the existing safe auth-refresh flow.

## Backend changes (local only)

1. Existing vendor-dashboard/orders routes and VendorOrderStatusService remain the only merchant state machine. The new order guard requires a normal JWT, verified ACTIVE account and ACTIVE owned business. Existing VENDOR/CUSTOMER workspace roles are unchanged; staff membership alone does not grant owner powers. Onboarding, foreign, disabled and expired principals fail closed.
2. Partner sign-out now stores a namespaced SHA-256 hash of the presented access token in the existing PartnerMobileSession table, purpose REVOKED_ACCESS, through its signed expiry. Order guards and transactions reject that exact signed-out token. Fresh approved Partner logins add a unique jti while preserving normal login/refresh/audit behavior and remaining access lifetime, preventing same-second collision with a tombstone. No raw token, new table or migration. This is narrow merchant-order token revocation, not a claim of global JWT-lineage revocation or any change to Customer/Captain auth endpoints. Account deletion still removes sessions.
3. Optional paired expectedStatus/expectedUpdatedAt retain bodyless web-client compatibility; mobile always supplies both. Mutations serialize with Partner sign-out/deletion, hold approval row locks, recheck ownership and claim Order by state/payment/timestamp using conditional updateMany. A lost claim returns 409 before payment/history writes. Existing refund-review flags, actor/role/business/order history and P1 push outbox are transactional. No payment amount/reference or provider call is changed.
4. Existing OrderStatusHistory is reused, not duplicated. Notifications run after commit; delivery failure cannot turn a committed business action into a reported failure. The existing P1 outbox retries generic merchant notifications without Customer PII. No new transport or realtime channel.
5. Explicit merchant response projections replace raw Order spreading on lists, detail and mutation responses. Existing web fields needed for rendering remain compatible with masked/area-only values. New shared contracts expose current timestamp, actions and reasons.
6. Partner onboarding HTTP test wiring includes the new guard's Prisma dependency. Source regression assertions now reflect P1's authenticated submission endpoint and P2's confirmed merchant controls, replacing obsolete public-submission/read-only assertions. No P1 security behavior is relaxed.

## Refresh and push

No authorized Partner order realtime channel exists; the ride gateway is unsuitable. Mode is FOREGROUND_REFRESH: focused/active screen polling every 20 seconds, finite request deadlines, one read in flight, foreground return, push invalidation and pull refresh. No background polling. Push taps validate Partner surface/UUID, approval, current session generation and exact owned order through a fresh read. Terminal/stale payloads cannot authorize actions; duplicate notification IDs are bounded/deduplicated. Physical APNs/deep-link delivery is not claimed by local contract tests.

## Validation

- 30 backend suites / 270 tests PASS, including the real loopback PostgreSQL HTTP/JWT integration matrix for every existing state/action pair, foreign owner/staff, onboarding/expiry/deactivation/sign-out, malformed inputs, concurrent duplicate actions, concurrent actor change, rollback, financial review and privacy canaries. All 25 order tests passed again after the final order-service edit.
- 21 mobile contract tests PASS: accept-to-ready, rejection reasons, stale state/timestamp, immediate double tap, unavailable preflight, lost response, 409, revoked access, late auth generation, single-flight read/forced refresh, terminal controls, grouping, invalidation, authorized exact/stale push and account-switch token-read race.
- Existing Partner, H11.2, P1 staging/permission/storage guards and shared API/session regressions PASS. Backend and Partner typechecks PASS.
- Expo Doctor 18/18 PASS. Production and synthetic .invalid staging introspection PASS; missing staging target rejected. Synthetic URL is not a staging service. iPhone-only, ng.com.karigo.partner, no location/camera/microphone/background mode; WHEN_UNLOCKED unchanged. Android package/version and generated Android configuration equal P1.
- Fresh Hermes iOS export PASS; all seven changed mobile runtime files match sourcesContent. Four singleton counts are one, 21 Expo Apple modules and the expected three React Native autolinks. Dependency tree and credential/scope scans PASS. No signed artifact/native compilation/physical iOS execution was performed.

Raw local logs/config/export evidence: C:/Dev/KariGO/artifacts/partner-p2-*. Test data uses dedicated synthetic databases on 127.0.0.1:55443 only. See p2-validation-results.json for machine-readable results. The dedicated PostgreSQL test server is stopped after validation.

## Next gate

READY_FOR_PARTNER_IOS_TASK_P2_5_STAGING_FOUNDATION = YES
READY_FOR_PARTNER_IOS_TASK_P3_NATIVE_QA = NO

A verified non-Production API and separately authorized deployment/physical/native validation remain necessary. The backend changes are not live, so these controls must not be treated as validated against the current Production API. Customer/Captain Apple matters and all Production states remain untouched.
