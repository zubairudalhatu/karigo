# Partner P3A.1 — hosted evidence closure

Date: 2026-11-15. Base: `c2aef160a177c0fd467aa5616feeb67e2362ea50`. This closes exactly the three hosted evidence gaps recorded in P3A. No application/runtime fix, migration, deployment, native build, OTA or Apple action was needed. Only internal evidence/documentation and two privacy-inventory descriptions changed.

## Protected access and immutable baseline

Used the existing signed-in Render web shell for `karigo-partner-p25-api-ratd` in the previously approved My Workspace. No SSH key was added, no database IP exception was opened, and no new public operator endpoint was enabled. Before queries/mutations, the existing staging guard verified all mock providers, dedicated storage, generated independent secrets and database identity hash `d1e4dd76c3e29c911a714d37b9d22280cc5b38f21e6f73b05066fc5744924502`.

Staging remains deployment `dep-dbs1fjlg1s2s73du2ipg`, source `ecc252ae782814f8d109a147d7619383fd4972c6`. Production remains `dep-dbd8gquq1p3s73cstagg`, source `c907d04b11c1b08cf57c0c82cff604abee07918e`; both were rechecked read-only after QA. Customer/Captain source and submissions were untouched.

The hosted runner used existing compiled services and the running staging HTTP API. A separate Nest dependency container supplied the existing deletion service for the protected operator-completion step; it did not listen on a port, change the running service, enable an admin route or initialize another background retry timer. The process installed the existing external-HTTP guard and suppressed free-form framework logs. Passwords/tokens remained in process memory and were not printed or persisted. Synthetic fixture setup used Prisma only after the independent staging identity checks.

## Fresh push proof

Disposable Partner user `78042bed-a153-42a8-9a37-a2d96999000f`, business `f13b4d49-853f-4ae6-a550-3fe54ffcc9d0`, order `bcdbb6c1-c698-45a2-b7dd-a45dfed2d4fd`.

Authenticated through the normal hosted Partner session endpoint, opted in and registered one new `PARTNER_STAGE_` synthetic IOS/EXPO target. Its registration was active and `PARTNER_APP` only. Accepted the owned synthetic order through the existing hosted HTTP action. This generated one stored Partner delivery job with attempts >= 1, state SENT and sentAt set. The running service's protected `/staging/evidence` supplied the matching `push.mock_result`: accepted=true, appSurface=PARTNER_APP, route=order, exact order ID and scheme=karigo-partner-staging. This is an implemented mock acknowledgement, not APNs delivery.

Marked the fixture order CANCELLED as controlled staging setup. A fresh authorized read returned no available actions and a current-version accept attempt returned 400. Logout removed the device row and the old session returned 401. Logged in again and re-registered for the deletion test. After final deletion, an order-change push attempt produced zero jobs; a validly signed staging JWT for the erased identity received 401 on business profile, onboarding status and exact order detail. Retained rows cannot grant authorization.

```ini
PUSH_EVENT_CREATED = YES
PUSH_TARGET_PARTNER_ONLY = YES
PUSH_ORDER_DEEPLINK_CORRECT = YES
PRODUCTION_DEVICE_TARGETED = NO
CROSS_APP_DEVICE_TARGETED = NO
DEVICE_REGISTRATION_CLEANUP = PASS
SYNTHETIC_PUSH_ENQUEUE = PASS
PARTNER_PUSH_NON_APNS_CHAIN = PASS
PARTNER_IOS_APNS_PHYSICAL = DEFERRED
```

## Image/document proof and cleanup semantics

Uploaded two fresh synthetic product images through the authenticated hosted API. Both landed under `/uploads/vendors/<disposable-business>/`, whose resolved filesystem paths were checked inside `/var/data/partner-stage/public`. Both public reads succeeded. Created a disposable product through the normal API, replaced its image, and verified wrong-business PATCH and DELETE requests return 404. Private document upload remained owner-only: unauthenticated read 401 and wrong Partner read 404.

Public image cleanup is an explicit reviewed external-storage operation in the existing deletion design; a product URL update is not automatic blob garbage collection. The protected operator removed the replaced image and later the final image only after checking the exact disposable vendor prefix and resolved path containment. Each old URL then returned 404. A recursive inspection of this fresh disposable business's public namespace found zero files. No unrelated/shared/static asset was deleted. `ORPHANED_STAGING_OBJECT = NO` applies to this P3A.1 fixture, not a claim of a bucket-wide orphan sweep.

The existing reviewed deletion service removed the actual private document bytes and metadata. The account-owned private namespace also contained zero files afterward. The internal inventory now explicitly records reviewed external public-object cleanup and observed private-document/draft erasure; no App Store privacy disclosure was changed. No camera/location permission or native picker result is claimed.

```ini
STAGING_PUBLIC_IMAGE_UPLOAD = PASS
STAGING_PUBLIC_IMAGE_READ = PASS
WRONG_OWNER_IMAGE_ACCESS = BLOCKED
PUBLIC_IMAGE_CLEANUP = PASS
ORPHANED_STAGING_OBJECT = NO
PRODUCTION_STORAGE_MUTATION = NO
PARTNER_STAGING_UPLOAD_E2E = PASS
```

## Reviewed permanent deletion and retention

Created only synthetic disposable profile/application/draft/document/catalogue records, one cancelled and one completed order, and a PAID synthetic settlement (gross 100, net 90, explicitly synthetic reference). No real provider Payment record, money movement, refund or payout occurred. The latter records deliberately exercise retention, rather than deleting them to make the audit pass.

The normal hosted flow rejected an invalid confirmation with 400, accepted the matching account ID/literal DELETE/private receipt, invalidated access, rejected refresh and re-login, and removed all device registrations. Original request `26563a2a-699d-4a2c-92fa-741231eaef42` then went through the existing `completePartnerPermanent` service after confirming no applicable holds, completed/cancelled work, paid settlement state, and external public-object cleanup. Its normal storage, balance, hold and transaction guards remained active. The receipt became COMPLETED.

The first runner stopped while creating an incomplete synthetic reviewer fixture; it had not called completion. Added the required synthetic phone and resumed the SAME request, without repeating the work/push/deletion phases. A separate deactivated ADMIN/OPERATIONS_ADMIN identity exists solely as the operator audit principal: empty password hash, phone unverified, no session/token issued. No real reviewer account was changed. Both the initial failure and final verification remain preserved.

| DATA_CATEGORY | BEFORE | AFTER | DISPOSITION | RETENTION_REASON |
| --- | ---: | ---: | --- | --- |
| Account identity | 1 | 1 | MINIMIZED/PSEUDONYMIZED | Non-authenticating tombstone/relational audit key; name replaced, email null, phone tombstoned, password empty, verification false |
| Partner business/profile | 1 | 1 | MINIMIZED/PSEUDONYMIZED | Closed/deleted business reference for retained orders; personal/contact/branding fields cleared |
| Business application | 1 | 1 | MINIMIZED/PSEUDONYMIZED | Approval/audit relationship; business/contact content replaced/cleared, deletedAt set |
| Temporary onboarding draft | 1 | 0 | DELETED | No ongoing purpose |
| Uploaded private document rows | 1 | 0 | DELETED | Reviewed owned object erasure completed |
| Uploaded private document objects | 1 | 0 | DELETED | No hold; resolved owned namespace empty |
| Fresh public image objects | 2 | 0 | DELETED | Replaced/final disposable objects explicitly removed; URLs 404 |
| Catalogue/product | 1 | 1 | MINIMIZED/PSEUDONYMIZED | Inactive/deleted catalogue reference; image null and content minimized |
| Refresh credentials | 2 | 0 | DELETED | Authentication must not survive deletion |
| Restricted session rows | 2 | 0 | DELETED | Authentication must not survive deletion |
| Partner device registrations | 1 | 0 | DELETED | No further push eligibility |
| Orders | 2 | 2 | RETAINED_WITH_JUSTIFIED_PURPOSE | Completed/cancelled business transaction and reconciliation history |
| Synthetic paid settlement | 1 | 1 | RETAINED_WITH_JUSTIFIED_PURPOSE | Accounting/reconciliation; net amount 90 and synthetic reference unchanged |
| Vendor audit records | 4 | 4 | MINIMIZED/PSEUDONYMIZED | Operational audit provenance; all oldValue/newValue payloads null |

Provider Payment rows were absent before and after (0 → 0), so no provider-payment deletion or retention action is asserted. The final deletion receipt/audit records retain the completion/security evidence under the existing retention policy. This is inspection of the synthetic categories exercised here, not certification of every possible historical/third-party record class.

```ini
PARTNER_STAGING_ACCOUNT_DELETION = PASS
DELETED_ACCOUNT_RELOGIN_BLOCKED = YES
DELETED_ACCOUNT_DEVICE_ELIGIBLE_FOR_PUSH = NO
DELETION_RETENTION_INSPECTION = PASS
PARTNER_PRIVACY_INVENTORY_MATCHES_HOSTED_BEHAVIOR = YES
```

## Regression evidence and remaining boundary

P1/staging/H11.2 mobile security guards and all 21 P2 order model/push/offline tests passed. Backend run covered 136 suites / 1,365 tests, including push isolation, storage/file authorization, session and deletion controllers. Three separately enabled dedicated-loopback PostgreSQL suites added 24 passing onboarding/deletion/order tests; combined 139 suites / 1,389 tests. Six unrelated infrastructure-gated suites / 98 tests remain skipped. Backend and Partner typechecks passed. The local synthetic PostgreSQL server was stopped after validation. Credential/diff scans found no high-confidence secret material or runtime source changes.

Hosted raw/final receipts and operator scripts: `/var/data/partner-stage/p3a1-{evidence,final-evidence}.json` and `p3a1-{runner,resume,verify,finalcheck}-source.cjs`. Local structured assessment: `p3a1-hosted-evidence.json` alongside this document. Local logs and screenshot: `C:/Dev/KariGO/artifacts/partner-p3a1-*`, including `hosted-proof.jpg`. The structured assessment transcribes the observed protected-shell results and retains the initial-fixture failure qualification.

The three P3A hosted gaps are closed. Software/staging readiness for a separately authorized physical task is YES. This is not physical acceptance or permission to register an Apple identity/build. Simulator execution/generated native-project regeneration on a suitable host, physical launch, APNs, native pickers/SecureStore, accessibility/layout and TestFlight install/update remain unproven. Existing simulator build remains unchanged.

PARTNER_APPLE_SUBMISSION_HOLD = YES. No Apple identifiers, ASC record, certificates/profiles, native build, TestFlight upload, OTA, Production deployment or Customer/Captain change occurred.
