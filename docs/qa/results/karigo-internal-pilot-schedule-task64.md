# KariGO Internal Pilot Schedule - Task 64

Note: This historical QA result copy is retained for traceability. The official pilot operations schedule now lives under `docs/pilot/`.

Date: 10 July 2026
Environment: Live staging

This schedule is designed for a controlled internal pilot with internal testers only. Adjust dates and times before execution.

## Recommended Pilot Duration

Suggested duration: 3 to 5 working days.

## Day 0: Setup

| Activity | Owner | Exit criteria |
|---|---|---|
| Confirm tester list | Pilot lead | All roles assigned |
| Confirm secure demo credential handoff | Staging admin | Testers can log in without credentials being written to Git/chat |
| Install Customer App | Customer tester | App opens on `customer-staging` |
| Install Rider App | Rider tester | App opens on `rider-staging` |
| Confirm Admin/Vendor portals | Admin and Vendor testers | Branded domains load |
| Confirm evidence storage | QA lead | Approved non-Git evidence location ready |
| Review issue severity rules | Pilot lead | Testers understand P0/P1/P2/P3 |

## Day 1: Primary E2E Order

| Time block | Activity | Owner | Expected output |
|---|---|---|---|
| Morning | Customer creates order and mock payment | Customer tester | Masked order/payment reference |
| Morning | Vendor accepts and prepares order | Vendor tester | Order status evidence |
| Midday | Admin assigns rider | Admin/dispatch tester | Assignment evidence |
| Midday | Rider completes delivery flow | Rider tester | Completed status, no OTP recorded |
| Afternoon | Support ticket test | Customer/Admin testers | Masked ticket reference |
| End of day | Daily review | Pilot lead | Issue log and next-day decision |

## Day 2: Repeat Flow And Edge Checks

| Activity | Owner | Expected output |
|---|---|---|
| Repeat order with different product/vendor if practical | Customer/Vendor testers | Second masked order reference |
| Validate vendor settlement visibility | Vendor tester | Settlement status evidence |
| Validate rider earnings visibility | Rider tester | Earnings status evidence |
| Validate admin reports | Admin tester | Dashboard/report observations |
| Check notifications | All testers | Notification title/status evidence |

## Day 3: Stabilization Review

| Activity | Owner | Expected output |
|---|---|---|
| Re-test any failed items | Assigned owner | Pass/fail update |
| Review P0/P1 issue status | Pilot lead | Go/No-Go recommendation |
| Review P2/P3 backlog | Technical lead | Follow-up tasks |
| Prepare final pilot report | QA lead | Final report draft |

## Optional Days 4-5

Use only if:

- the first E2E flow was blocked;
- repeated P2/P3 issues need confirmation;
- management requests more confidence before external pilot.

## Daily Decision Options

| Decision | Meaning |
|---|---|
| Continue | No P0/P1 issue and pilot can proceed |
| Continue with caution | P2/P3 issues exist but core flow works |
| Pause for fix | P0/P1 issue or repeated operational failure |
| Stop pilot | Security, data integrity or major reliability concern |
