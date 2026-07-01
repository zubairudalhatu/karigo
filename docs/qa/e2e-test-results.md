# MVP End-to-End Test Results

Tested on June 13, 2026 against local PostgreSQL 17 and the real NestJS HTTP API.

| Scenario | Result | Bug found | Fix applied | Remaining TODO |
|---|---|---|---|---|
| Backend health and Swagger | Passed | Local `karigo` database did not exist | Created local database, applied migration, seeded data | Docker is optional locally; document Windows PostgreSQL path |
| Customer food order | Passed | None during live run | N/A | Device-level Expo UI testing |
| Parcel delivery | Passed after fix | Paid parcel remained `PAID`, with no vendor route to make it dispatch-ready | Successful parcel payment now moves order to `READY_FOR_PICKUP` and records PAID plus readiness history | Review dispatch SLA policy |
| Vendor rejection and refund | Passed | None | N/A | Real gateway refund integration deferred |
| Support ticket workflow | Passed | None | N/A | Device/browser UI walkthrough |
| Promotions | Passed | Admin report page expected `code`, API returns `promoCode` | Corrected admin promo report rendering | Advanced campaigns deferred |
| Notifications | Passed | None | N/A | Real external providers deferred |
| Access control | Passed | None | N/A | Add penetration/security review before public launch |

## Live Smoke Checks

`npm run test:e2e:smoke --workspace @karigo/backend-api` passed 24 checks covering registration/OTP, promo validation, payments, webhook idempotency, vendor workflow, dispatch, OTP completion, earnings, settlements, parcel dispatch, refunds, support visibility, notifications, ownership, roles, reports, and promo usage.

## Automated Tests

- Backend: 23 suites, 71 tests passed.
- Full monorepo typecheck: passed.
- Web dashboard production builds: passed.
- Customer and rider Android Expo export validation: passed previously using `--no-bytecode`.
