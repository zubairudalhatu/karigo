# KariGO Internal Pilot Issue Reporting Workflow - Task 64

Date: 10 July 2026
Environment: Live staging

Use this workflow for all issues found during the controlled internal pilot.

## Severity Levels

| Severity | Definition | Required action |
|---|---|---|
| P0 | Security breach, data exposure, payment integrity issue, app unusable, or end-to-end order impossible | Stop pilot and escalate immediately |
| P1 | Core role flow blocked: customer, vendor, admin/dispatch or rider cannot complete required action | Pause affected flow and assign urgent fix |
| P2 | Important usability, reporting or operations issue with workaround | Continue internal pilot with caution |
| P3 | Minor copy, visual, documentation or low-risk issue | Log for later polish |

## Issue Reporting Fields

| Field | Required |
|---|---|
| Issue ID | Yes |
| Date/time | Yes |
| Reporter | Yes |
| Role/surface | Yes |
| Severity | Yes |
| Masked order/ticket/reference | If applicable |
| Description | Yes |
| Steps to reproduce | Yes |
| Expected result | Yes |
| Actual result | Yes |
| Screenshot/log reference | Optional, outside Git if sensitive |
| Owner | Yes |
| Status | Yes |
| Target resolution | For P0/P1/P2 |
| Retest result | Before closure |

## Issue Log Template

| Issue ID | Date/time | Surface | Severity | Description | Status | Owner | Launch impact |
|---|---|---|---|---|---|---|---|
| PILOT-001 |  |  |  |  | Open |  |  |

## Escalation Timing

| Severity | Escalation target | Target response |
|---|---|---|
| P0 | Pilot lead, technical lead, management lead | Immediate |
| P1 | Pilot lead and technical lead | Same pilot session |
| P2 | Pilot lead and assigned owner | Same day |
| P3 | QA backlog owner | Next planning review |

## Closure Rules

- P0/P1 issues require retest evidence before closure.
- P2 issues require owner approval or management acceptance as non-blocking.
- P3 issues may be batched for polish.
- Do not mark an issue closed based only on assumption.
- Do not attach screenshots containing passwords, tokens, OTP values or provider secrets.

## Pilot Stop Conditions

Stop or pause the pilot immediately if:

- customer payment/order status becomes inconsistent;
- delivery OTP is exposed to unauthorized roles;
- customer, vendor, rider or admin data crosses role boundaries;
- live providers or gated services appear active unexpectedly;
- backend becomes unavailable for repeated checks;
- a tester accidentally uses real private data.
