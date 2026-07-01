# Go/No-Go Readiness Scoring Matrix

Scoring scale:

- 1: Not ready / no evidence
- 2: Planned or partially implemented, not staging-verified
- 3: Works in local/mock evidence, staging evidence incomplete
- 4: Staging verified with non-critical issues
- 5: Staging verified and approved by accountable owner

Decision bands:

- `GO`: no critical blocker and weighted score meets the approved threshold.
- `CONDITIONAL GO`: only minor/medium issues remain, with owners and target dates.
- `NO-GO`: any unresolved critical issue in payment, OTP, security, order flow, rider
  delivery, refund control, or operational readiness.

## Current Task 38 Score

| Category | Weight | Score | Weighted score | Evidence reference | Key findings | Blockers | Recommended action |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| Customer journey | 10 | 2 | 20 | `docs/qa/private-staging-primary-simulation-execution-record.md` | Integrated, but private staging run is blocked | Staging URL/accounts/mobile evidence missing | Provision staging and run full customer scenario |
| Vendor operations | 8 | 2 | 16 | `docs/qa/private-staging-primary-simulation-execution-record.md` | Integrated and documented | Staging vendor order-processing evidence missing | Run vendor rehearsal after provisioning |
| Rider operations | 8 | 2 | 16 | `docs/qa/private-staging-primary-simulation-execution-record.md` | Integrated and documented | Physical-device/staging rider flow missing | Run rider delivery rehearsal |
| Admin operations | 10 | 2 | 20 | `docs/qa/private-staging-primary-simulation-execution-record.md` | Integrated and documented | Staging dispatch/refund/support evidence missing | Run admin rehearsal |
| Payment | 10 | 3 | 30 | `docs/providers/paystack-sandbox-integration.md` | Mock works; Paystack sandbox prepared | Management approval, secure credentials, redirect/webhook staging | Keep mock; certify Paystack in staging |
| OTP/security | 8 | 3 | 24 | `docs/providers/sms-otp-provider-integration-plan.md` | Mock OTP works; Termii prepared | Sender approval, staging SMS credentials, distributed rate limits | Keep mock; run Termii sandbox later |
| Notifications | 6 | 3 | 18 | `docs/providers/` | In-app and mock providers covered; external channels fail closed | Push/WhatsApp/email sandbox not approved | Keep mock external providers |
| Support/refunds | 8 | 2 | 16 | `docs/qa/private-staging-primary-simulation-execution-record.md` | Workflows exist | Full staging support/refund rehearsal missing | Run support/refund scenario |
| Reporting/settlements | 6 | 2 | 12 | `docs/qa/private-staging-primary-simulation-execution-record.md` | APIs/docs exist | Staging finance/report data validation missing | Run finance/report check |
| Security/access control | 10 | 3 | 30 | Backend tests and `docs/qa/private-staging-negative-simulation-execution-record.md` | Guards and ownership tests exist | Full staging cross-user attack rehearsal missing | Run negative access tests |
| Technical stability | 8 | 3 | 24 | Automated build/test evidence | Backend tests pass locally; staging not provisioned | Deployed staging uptime/monitoring missing | Deploy staging and monitor |
| Operational readiness | 10 | 1 | 10 | `docs/launch/controlled-soft-launch-plan.md` | Strong ops docs exist | Real pilot team/vendor/rider/customer approvals missing | Assign owners and rehearse |
| Legal/policy readiness | 8 | 1 | 8 | `docs/handover/controlled-soft-launch-approval-checklist.md` | Legal/policy review required | Legal sign-off missing | Complete policy review |
| Provider readiness | 8 | 2 | 16 | `docs/handover/final-provider-readiness-matrix.md` | Mock ready; sandbox paths prepared | Live/sandbox approvals incomplete | Finish staged provider certification |

Total weighted score: **260 / 590**.

Current decision band: **NO-GO for controlled real-customer soft launch**.

This score supports internal demo and staging preparation only. It did not improve in
Task 38 because private staging inputs were not supplied. Rescore after private staging
is deployed and the execution records contain evidence.
