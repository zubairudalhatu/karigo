# KariGO Soft Launch Execution Plan - Task 104

Date prepared: 2026-07-13
Pilot location: Kano
Recommended duration: 7 to 14 days

## Purpose

This plan prepares KariGO for the first controlled soft launch pilot in Kano. It turns the
Task 103 readiness pack into an execution structure for operations, support, dispatch,
vendors, Delivery Captains and selected customers.

This is an operations, documentation and communications task only. It does not activate
live Paystack, live Accelerate.ng utilities, live Termii SMS, wallet withdrawals,
automatic refunds, live rides, payouts, Pharmacy marketplace, provider login or any new
live provider integration.

## Pilot Scope

| Area | Scope |
| --- | --- |
| Location | Kano |
| Pilot vendors | 3 to 5 selected vendors |
| Pilot customers | 20 to 50 invite-only customers |
| Delivery Captains | 3 to 5 approved Delivery Captains |
| Operations admins | 2 to 3 operations/admin users |
| Duration | 7 to 14 days |
| Payment mode | Mock payment by default; Paystack Test Mode only if separately approved |
| Utilities | Test mode only; no Accelerate.ng live fulfilment |
| SMS | Disabled/mock only; no Termii live sending |
| SME Services | Manual request/review/coordination only |
| KariGO Rides | Readiness only; no live rides |
| Pharmacy | Readiness/compliance gated only |

## Launch Objectives

- Complete real controlled order journeys with selected pilot users.
- Confirm vendor response quality and order preparation timing.
- Confirm Delivery Captain assignment, pickup, delivery and customer delivery-code completion.
- Confirm Admin Portal monitoring, support handling and daily reporting.
- Confirm settlement and earning visibility without payout automation.
- Capture masked evidence and issues for management review.
- Decide whether to continue, expand, pause or stop after the pilot window.

## Pilot Roles

| Role | Recommended count | Responsibilities |
| --- | --- | --- |
| Pilot Lead | 1 | Owns launch decision, daily standup and final report |
| Operations Admin | 2 to 3 | Monitors orders, vendors, support and reporting |
| Dispatch Officer | 1 to 2 | Assigns Delivery Captains and handles reassignment |
| Support Officer | 1 to 2 | Handles customer/vendor/Captain issues |
| Technical Lead | 1 | Monitors backend, app issues and deployment health |
| Finance/Admin Reviewer | 1 | Reviews refunds, settlements and wallet/admin adjustments |
| Vendor Coordinator | 1 | Confirms vendor readiness and response quality |
| Captain Coordinator | 1 | Confirms Delivery Captain readiness and conduct |

## Entry Checklist

| Check | Required state | Status | Owner |
| --- | --- | --- | --- |
| Management approval | Signed go/no-go checklist | Pending | Pilot Lead |
| Pilot vendors | 3 to 5 vendors confirmed | Pending | Vendor Coordinator |
| Pilot customers | 20 to 50 invited customers approved | Pending | Pilot Lead |
| Delivery Captains | 3 to 5 active Delivery Captains confirmed | Pending | Captain Coordinator |
| Operations admins | 2 to 3 admins available | Pending | Operations Lead |
| Customer App | Current staging APK/EAS update installed | Pending | QA Lead |
| KariGO Captain App | Current staging APK/EAS update installed | Pending | QA Lead |
| Admin/Vendor domains | Branded domains reachable | Pending | Technical Lead |
| Backend health | `/api/v1/health` green | Pending | Technical Lead |
| Evidence handling | Masking rules understood | Pending | QA Lead |
| Issue triage | Triage register ready | Pending | Support Lead |

## Pilot Phases

| Phase | Timing | Activities | Exit condition |
| --- | --- | --- | --- |
| Phase 0: Setup | 1 to 2 days before pilot | Confirm roster, install apps, verify accounts, brief participants | All entry checks pass |
| Phase 1: Day-one controlled flow | Day 1 | Run first supervised order from customer to settlement visibility | No P0/P1 issue |
| Phase 2: Limited daily operations | Days 2 to 5 | Run small daily order volume and support monitoring | Stable daily report |
| Phase 3: Review and adjustment | Midpoint | Review issues, decide continue/pause/expand | Management accepts status |
| Phase 4: Closeout | Final day | Complete report, issue register, recommendation | Final go/no-go recorded |

## Guardrails

Paystack Test Mode, Accelerate utility services, and Termii SMS are integration-ready
concepts only. Live payment collection, live utility fulfilment, wallet refund automation,
SMS sending and payout automation remain disabled until separately approved.

Stop the pilot immediately if any secret, OTP, delivery code, token, provider credential,
private customer data or cross-tenant record is exposed.

