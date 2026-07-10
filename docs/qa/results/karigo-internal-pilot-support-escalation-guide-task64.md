# KariGO Internal Pilot Support Escalation Guide - Task 64

Note: This historical QA result copy is retained for traceability. The official pilot support escalation guide now lives at `docs/pilot/karigo-pilot-support-escalation-guide-task64.md`.

Date: 10 July 2026
Environment: Live staging

This guide defines how pilot issues should move from tester observation to support, dispatch, technical or management escalation.

## Escalation Levels

| Level | Owner | Typical issues | Target response |
|---|---|---|---|
| Level 1 | Support observer | Customer question, unclear message, support ticket check | Same session |
| Level 2 | Dispatch/admin tester | Rider assignment, vendor readiness, order status timing | Same session |
| Level 3 | Technical lead | App crash, API error, auth failure, wrong data visibility | Immediate for P0/P1, same day for P2 |
| Level 4 | Finance/admin lead | Settlement, rider earning, mock refund visibility | Same day |
| Level 5 | Management lead | P0 issue, repeated P1, pilot stop decision | Immediate |

## Escalation Rules

- P0: stop affected flow and notify pilot lead, technical lead and management lead immediately.
- P1: pause affected role flow and assign owner before continuing.
- P2: continue with caution if workaround is safe.
- P3: log for backlog; do not interrupt the pilot.

## Common Pilot Issues

| Issue | First responder | Escalation owner |
|---|---|---|
| Customer cannot log in | Support observer | Technical lead |
| Vendor cannot see paid order | Admin/dispatch tester | Technical lead |
| Admin cannot assign rider | Admin/dispatch tester | Technical lead |
| Rider cannot complete delivery | Rider tester | Technical lead |
| Delivery OTP visible to wrong role | Any tester | Management and technical lead |
| Support internal note visible to customer | Support observer | Technical lead |
| Settlement amount looks wrong | Vendor tester | Finance/admin lead |
| App crash | Affected tester | Technical lead |
| Gated service appears live | Any tester | Pilot lead and technical lead |

## Safe Communication Rules

- Share masked order references only.
- Do not send passwords or OTPs in group chats.
- Do not paste bearer tokens or API responses containing private data.
- Use private secure channels only for credential handling.
- Store sensitive screenshots outside Git.

## Closure Requirements

| Severity | Closure requirement |
|---|---|
| P0 | Fix verified, management accepts restart of pilot |
| P1 | Retest passes or pilot lead accepts workaround |
| P2 | Owner assigned and workaround documented |
| P3 | Backlog item created |
