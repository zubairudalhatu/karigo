# Final Launch Blocker Register

Severity: `Critical`, `High`, `Medium`, `Low`.

| Blocker ID | Area | Description | Severity | Evidence reference | Owner | Required fix | Target date | Status | Launch effect | Verification required before closure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLK-001 | Staging | Deployed staging environment is not evidenced | Critical | `docs/deployment/staging-deployment-plan.md` | Engineering/DevOps | Provision staging API, database, dashboards, app test builds | TBD | Open | Blocks real-customer pilot | Health, Swagger, API, app smoke evidence |
| BLK-002 | E2E | Full customer-to-vendor-to-admin-to-rider staging simulation not executed | Critical | `docs/qa/full-staging-primary-scenario.md` | QA/Product | Run and record full scenario evidence | TBD | Open | Blocks go decision | Evidence register with passed primary scenario |
| BLK-003 | Payment | Paystack sandbox activation lacks approval, secure credentials, webhook/callback evidence | Critical | `docs/providers/sandbox-activation-readiness-check.md` | Finance/Engineering | Complete Paystack sandbox certification or keep mock-only pilot decision | TBD | Open | Blocks real payment pilot | Payment sandbox test evidence |
| BLK-004 | OTP | Termii/SMS sandbox lacks approval, sender ID, credentials, delivery evidence | Critical | `docs/providers/sms-otp-sandbox-activation-readiness-check.md` | Ops/Security/Engineering | Complete OTP sandbox certification or approve mock-only closed test | TBD | Open | Blocks real user onboarding | SMS OTP sandbox evidence |
| BLK-005 | Legal | Terms, privacy, refund policy, vendor agreement, rider agreement not signed off | Critical | `docs/handover/controlled-soft-launch-approval-checklist.md` | Legal/Product | Complete legal and data-protection review | TBD | Open | Blocks real users | Signed approval checklist |
| BLK-006 | Operations | Vendors, riders, support, dispatch, finance owners not approved for pilot | Critical | `docs/launch/pilot-governance.md` | Management/Operations | Name owners and rehearse daily process | TBD | Open | Blocks controlled soft launch | Signed operations rehearsal evidence |
| BLK-007 | Mobile QA | Customer/rider physical-device pilot checks are not evidenced | High | `docs/frontend/mobile-push-sandbox-test-notes.md` | Mobile/QA | Run app flows on approved test devices | TBD | Open | High launch risk | Device test evidence |
| BLK-008 | Security | Full staging role/ownership negative tests not executed | Critical | `docs/qa/full-staging-negative-scenarios.md` | Security/QA | Run access-control scenarios | TBD | Open | Blocks launch if unverified | Passed negative tests |
| BLK-009 | Monitoring | Staging monitoring, logging, backup/restore evidence missing | High | `docs/deployment/staging-deployment-checklist.md` | DevOps | Configure and test monitoring/backups | TBD | Open | Blocks reliable pilot | Monitoring and restore rehearsal evidence |
| BLK-010 | External notifications | Email, push, and WhatsApp sandbox channels not approved or activated | Medium | `docs/providers/` | Product/Ops | Keep external channels mock; in-app primary | TBD | Open | Does not block mock-provider demo | Management confirms provider mode |
| BLK-011 | Private staging execution | Task 38 private staging simulation cannot run without staging URLs, database, secret manager, demo account handover, and evidence storage | Critical | `docs/qa/private-staging-issue-register.md` | Engineering/DevOps/QA | Complete private staging deployment decision record and environment validation | TBD | Open | Blocks Task 38 simulation and launch decision | `ISS-001` through `ISS-003` closed with evidence |

## Current Blocker Decision

Any real-customer controlled soft launch is blocked while `BLK-001` through `BLK-006`,
`BLK-008`, and `BLK-011` remain open.
