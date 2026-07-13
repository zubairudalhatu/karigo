# KariGO Soft Launch Issue Triage Register - Task 103

Date prepared: 2026-07-13

## Severity Guide

| Severity | Definition | Required action |
| --- | --- | --- |
| P0 | Security, credential, payment integrity, cross-tenant data, delivery code exposure, live-provider activation or total order-flow failure | Stop/pause pilot immediately |
| P1 | One core role cannot complete required pilot flow | Pause affected flow and assign urgent fix |
| P2 | Workaround exists but pilot quality or operations are affected | Continue only with owner and target fix date |
| P3 | Cosmetic, copy, documentation or low-risk operational issue | Track for routine fix |

## Issue Register

| Issue ID | Date/time | Surface | Severity | Description | Reproduction steps | Owner | Status | Target fix date | Launch impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T103-ISS-001 |  | Customer App / Vendor / Admin / Captain / Website / Backend / Ops | P0/P1/P2/P3 |  |  |  | Open |  |  |  |

## Required Escalation

Escalate immediately to management, operations and technical leads if:

- Any live provider activates unexpectedly.
- A payment is marked successful without backend verification.
- Delivery code/OTP is exposed outside the owning customer flow.
- Vendor, customer, Captain or provider data is visible to the wrong account.
- A password, token, key, device token or private provider credential is exposed.
- Admin loses visibility or control of active orders.
- Support cannot receive or resolve pilot customer issues.

## Closure Rules

An issue can be closed only when:

- Root cause is understood.
- Fix or operational workaround is documented.
- Retest result is recorded.
- QA owner accepts the result.
- Any affected management decision is updated.

