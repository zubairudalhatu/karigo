# Partner P3A staging functional audit — 2026-11-15

P3A is an evidence-backed partial acceptance, not physical/native acceptance. No application, backend runtime, migration, infrastructure configuration, Apple identity, build or OTA was changed. This commit records audit results only. P3B readiness is NO because required hosted end-to-end evidence remains incomplete.

## Baseline and environment

- Base: `392346bcdcece4cf5e867ab3cac71f3e471ede95`. Mobile/shared runtime is unchanged from simulator source `7c9683533f142aa0a8aa2fa6ae9a240999b28372`.
- Live staging remains `dep-dbs1fjlg1s2s73du2ipg`, backend `ecc252ae782814f8d109a147d7619383fd4972c6`. `/ready` returned 200 and the exact source; all HTTP acceptance requests required `X-KariGO-Environment: partner-staging` and prohibited redirects. The 484-file P2 runtime/schema/migration manifest passes.
- Existing simulator build `5feeb54f-5864-4478-9eba-df167a3b1a2f`; archive SHA-256 `02ede7fce9588c8af98ca1b00744e4ea09f19c4156e2266cb6fd9aa41ee29e94`, 16,364,139 bytes. No rebuild.
- Windows has no usable iOS Simulator/Xcode environment. No simulator install, launch, visual interaction or physical result is claimed. Expo prebuild explicitly refused iOS native-project generation on Windows; generated config introspection succeeded.
- Render workspace is the previously approved My Workspace. SSH failed with public-key authentication denied. The database remains private; no IP exception or new key was added. The user supplied the existing generated staging QA password through hidden PowerShell input. It was passed through stdin, kept in process memory and cleared, never included in arguments, logs, report files or commits.

## Functional matrix

| Area | Result | Evidence and limit |
| --- | --- | --- |
| Registration, OTP verification, password proof, restricted login | PASS | Fresh reserved synthetic applicant; real hosted HTTP/JWT contracts, mock delivery only |
| Credential-free draft and own application status | PASS | Save/status succeed; password field rejected 400 |
| Pending applicant operational access | PASS | Profile/order operations denied 401 |
| Approved login, restore contract, business, catalogue, order list/detail | PASS | Hosted endpoints accept current approved session; device SecureStore restore not tested |
| ACCEPT → PREPARING → READY | PASS | Seed order 300 reaches READY_FOR_PICKUP using fetched state/update-time preconditions |
| REJECT and terminal mutation denial | PASS | Seed order 301 rejected with 201; subsequent forbidden accept rejected 400 |
| Stale version and concurrent double submit | PASS | Old version 409; simultaneous order-308 accept requests yield exactly one 201 and one 409 |
| Wrong business / restricted scope | PASS | Hosted foreign detail 404 and onboarding token 401; local real-JWT tests also cover non-owning team member, expiry and disabled account |
| Revoked session | PASS | Logout denies order read and refresh, both 401 |
| HANDOFF / COMPLETE | PASS | Hosted routes 404; mobile action whitelist excludes both |
| Public logo / product images | PARTIAL | Hosted synthetic uploads scoped to vendor 101 and readable; no P3A public-object deletion proof |
| Private documents | PASS | Hosted owner read, private/no-store, anonymous 401, wrong Partner 404, delete then 404; invalid MIME 400 and >10 MB 413 |
| Synthetic push registration / surface isolation | PASS | Staging token accepted; non-staging token 409; restricted applicant 401 |
| Fresh hosted enqueue-to-mock-delivery chain | NOT PROVEN IN P3A | P2.5 same-live-source three mock receipts retained; P3A registration happened after tested mutations, so those mutations do not prove new delivery |
| Permanent deletion immediate access removal | PASS | Disposable identity 6: invalid confirmation 400; DELETE accepted; operational access and re-login denied; private receipt readable |
| Hosted reviewed erasure / device rows / retained transactions | NOT PROVEN IN P3A | Local full-erasure, retention and cleanup-failure tests pass; hosted operator inspection/completion not available. Do not equate immediate deactivation with completed erasure |
| Offline / timeout / reconnect / stale cache | PASS, headless contract | P2 state-model tests: failed reads leave read-only cache, preflight failure blocks POST, lost response is uncertain, no replay; reconnect reload restores authoritative state. No native airplane-mode test |

The hosted runner's original aggregate was FAIL solely because it expected 409 for the terminal action and observed 400. The rejection succeeded and its VENDOR_REJECTED assertion passed before that response. `VendorOrderStatusService.assertTransition` intentionally throws BadRequestException (400) for an illegal transition with a current version; stale versions throw 409. The expected value in the retained runner was corrected. The original JSON remains unchanged; no fictional rerun or new green aggregate was created.

## Mobile action UX/state contract

For ACCEPT, REJECT, PREPARING and READY, the existing screen uses fresh server `availableActions`, an explicit confirmation, disabled controls and a Checking/saving state. The shared operation model synchronously blocks a second confirmation, fetches a fresh version before POST, refreshes changed/409 state, reloads authoritative status after success and displays uncertainty on transport failure. REJECT additionally requires a supported reason and bounded business note. Terminal notifications re-fetch current authorized detail and cannot restore controls; logged-out/foreign notifications cannot navigate. These are source/headless assertions, not simulator presentation results.

## Privacy, deletion and storage qualifications

- P1 inventory remains applicable: selected images/documents and entered business addresses, no GPS/camera/microphone dependence; system image/document pickers, temporary picker-cache cleanup and WHEN_UNLOCKED session/receipt storage remain unchanged.
- Order serializers omit general Customer notes, exact address/delivery instructions and provider fields; names/phone are masked and history notes bounded to permitted business content. Existing real-database privacy regression passed.
- Staging application evidence emits only bounded operation/status metadata, not bodies, passwords, OTPs, tokens, bank values or document bytes. The external acceptance report contains only check outcomes and safe status codes. This is scoped verification, not a platform-wide logging certification.
- Deletion requires an authenticated principal, matching account ID, literal DELETE and a private receipt capability. There is no separate fresh-password/recent-auth challenge in this path; prepare-deletion generates a capability, not reauthentication. No unimplemented recent-auth protection is claimed.
- Final erasure requires a separate authorized retention/hold/external-cleanup review; the staging HTTP allowlist excludes that admin operation. It was not bypassed. Identity 6 is now deactivated and must not be reused as a fresh fixture. Necessary transaction retention was tested locally and previously in P2.5, not inspected on the hosted database in this run.
- Two public synthetic P3A image objects remain on the isolated staging disk. Private test document bytes were deleted. Seed orders 300, 301 and 308 were intentionally consumed; no fixture reset occurred. All runner sessions were logged out, including cleanup attempts for already revoked/deleted sessions. No real device token was accepted.
- Existing user-tapped public Privacy/Terms/Support website links remain distinct from the staging operational API. They were not opened and no public contact form was submitted. Do not claim all possible public web navigation is staging-only.

## Validation

- Backend full run: 136 suites / 1,365 tests PASS. Three separately enabled dedicated-loopback integration suites: 24 tests PASS. Combined: 139 suites / 1,389 tests; six unrelated infrastructure-gated suites / 98 tests remain skipped.
- Partner P1/staging/H11.2 guards and 21 P2 mobile order tests PASS; shared API/session regressions PASS; backend and Partner typechecks PASS.
- Staging isolation guards 4/4 PASS when invoked from the backend working directory. An initial invocation from repository root failed only because a child-process require is cwd-relative; that raw failure was retained.
- Expo Doctor 18/18 PASS; fresh iOS Hermes export PASS; four bundle singletons each count one; installed dependency check PASS.
- Generated staging config: iPhone-only, staging bundle/runtime/channel/API; no location/camera/microphone usage strings or background location mode. Missing staging URL fail-closed and production intent `ng.com.karigo.partner` are covered by the unchanged regression guards.
- Archive inspection: exact simulator identity, permissions, icon asset catalogue and splash storyboard resources present; no embedded provisioning profile or private-key/env files. Generated config requests development APNs as expected from expo-notifications. Signed entitlement extraction was not performed without codesign; no physical APNs capability is certified.
- No runtime diff against the existing simulator source; no Production API fallback in generated operational configuration. Production remains `dep-dbd8gquq1p3s73cstagg` / `c907d04b11c1b08cf57c0c82cff604abee07918e`. No Production, Customer or Captain mutation.

## Evidence

Machine-readable assessment: `p3a-validation-results.json` in this directory. Raw local evidence under `C:/Dev/KariGO/artifacts/partner-p3a-*`: hosted-results.json, hosted-qa.cjs (one-time consumed-fixture runner), backend-tests.log, database-integration.log, mobile-tests.log, backend-types.log, mobile-types.log, shared-config-tests.log, isolation-tests[-correct-cwd].log, expo-doctor.log, hermes-export.log, staging-introspect.json, prebuild.log, native-inspection.json, singletons.json and dependencies.json. Existing P2.5 archive/static/hosted smoke evidence is retained separately and explicitly identified as prior-run evidence.

## Remaining gates

Obtain protected staging operator access for fresh hosted push delivery evidence, synthetic public-object cleanup, device/session row inspection and reviewed final erasure/retention evidence. Do not open the private database or bypass review to manufacture a pass. Recreate disposable fixtures only through a separately reviewed staging setup when needed.

Native blockers remain simulator execution/generated-project review on a suitable host; physical iPhone launch, APNs token/receipt/tap, system pickers, device SecureStore, layout/accessibility and TestFlight install/update. Apple identity/APNs/build authorization remains separate. No new macOS CI workflow was introduced.

PARTNER_APPLE_SUBMISSION_HOLD = YES. READY_FOR_PARTNER_IOS_TASK_P3B_PHYSICAL_QA = NO. No Apple registration, ASC record, provisioning, TestFlight upload, submission, OTA or Production deployment occurred.
