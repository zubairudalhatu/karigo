# KariGO Day-One Incident Response - Task 108

Date prepared: 2026-07-13

## Purpose

Provide the first pilot day incident response rules, severity definitions and escalation
paths. This document does not activate any live provider or product feature.

## Severity Levels

| Severity | Definition | Action |
| --- | --- | --- |
| P0 | Security, credential, payment integrity, cross-tenant data, delivery code exposure, live provider activation or total order-flow failure | Stop/pause pilot immediately |
| P1 | One core role cannot complete the required pilot flow | Pause affected flow and assign urgent owner |
| P2 | Workaround exists but pilot quality or operations are affected | Continue only with owner and target fix |
| P3 | Cosmetic, copy, documentation or low-risk issue | Track for follow-up |

## Immediate Stop Conditions

Stop the pilot immediately if:

- live Paystack activates unexpectedly;
- live Accelerate.ng utility fulfilment activates;
- live Termii SMS sends;
- wallet withdrawal or automatic refund appears active;
- live rides or ride dispatch appears active;
- payout automation appears active;
- Pharmacy marketplace appears active;
- provider login appears active;
- a password, OTP, delivery code, bearer token, API key or private payment detail is exposed;
- a vendor sees another vendor's order/settlement;
- a Delivery Captain sees a customer delivery code;
- admin loses operational control of active orders.

## Incident Log

| Incident ID | Time | Surface | Severity | Description | Immediate action | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T108-INC-001 |  |  | P0/P1/P2/P3 |  |  |  | Open |  |

## Escalation Paths

| Issue type | First responder | Escalation owner | Target response | Closure requirement |
| --- | --- | --- | --- | --- |
| Customer issue | Support Lead | Operations Lead | 15 minutes | Customer update recorded |
| Vendor issue | Vendor Coordinator | Operations Lead | 15 minutes | Vendor status confirmed |
| Delivery Captain issue | Dispatch Lead | Operations Lead | 10 minutes | Assignment or workaround recorded |
| Login/session issue | Support Lead | Technical Lead | 20 minutes | Retest passed or hold recorded |
| Payment/test-mode issue | Support Lead | Finance/Admin + Technical Lead | 20 minutes | No false paid state |
| Delivery code issue | Dispatch Lead | Technical Lead | Immediate | Code exposure ruled out or pilot paused |
| Secret/privacy issue | Any owner | Pilot Lead + Technical Lead | Immediate | Pilot paused and evidence secured |

## Incident Closure

An incident can close only when:

- root cause or operational cause is documented;
- affected users are updated where needed;
- retest or workaround is recorded;
- no sensitive evidence is stored in Git;
- Pilot Lead accepts closure.

