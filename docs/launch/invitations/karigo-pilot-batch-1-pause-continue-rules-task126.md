# KariGO Pilot Batch 1 Pause And Continue Rules - Task 126

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Define clear pause, continue and resume rules for Batch 1 controlled invitations.
These rules protect pilot participants, operations and the KariGO platform while
early access remains limited.

This document is operational only. It does not activate live payment providers,
utilities, rides, ride dispatch, payouts, wallet withdrawals, automatic refunds,
Pharmacy marketplace, provider login or bulk messaging.

## Decision Owners

| Decision | Primary owner | Backup |
| --- | --- | --- |
| Pause invitations | Pilot Lead | Operations Lead |
| Resume invitations | Pilot Lead | Management Reviewer |
| Pause ordering window | Pilot Lead | Operations Lead |
| Pause vendor onboarding | Operations Lead | Pilot Lead |
| Pause Delivery Captain onboarding | Dispatch Lead | Pilot Lead |
| Technical incident severity | Technical Lead | Pilot Lead |

## Continue Conditions

Continue Batch 1 invitations only when all conditions below remain true:

- No open P0 issue.
- No open P1 issue that blocks ordering, login, dispatch, delivery completion or
  privacy/safety.
- Backend health endpoint is responding.
- Admin Portal and Vendor Dashboard are reachable.
- Customer App and KariGO Captain App install/login checks are passing for
  invited participants.
- Mock payment remains the selected pilot payment mode.
- Live rides and ride dispatch remain disabled.
- Payout and wallet withdrawal/refund automation remain disabled.
- Support, dispatch and technical owners are available.

## Pause Triggers

| Trigger ID | Condition | Required action |
| --- | --- | --- |
| `PAUSE-126-001` | Live payment screen appears or real payment is requested | Pause customer invitations and ordering immediately |
| `PAUSE-126-002` | Live ride booking or ride dispatch becomes accessible | Pause app distribution and escalate to technical lead |
| `PAUSE-126-003` | Customer delivery code appears in wrong surface or before eligible status | Pause delivery tests and escalate as P0/P1 |
| `PAUSE-126-004` | APK link is shared outside approved pilot group | Pause distribution, revoke link where possible and notify pilot lead |
| `PAUSE-126-005` | Backend health fails for more than 10 minutes during active window | Pause new invites and active order creation |
| `PAUSE-126-006` | Admin Portal or Vendor Dashboard is unavailable during active order window | Pause customer order wave until operations access is restored |
| `PAUSE-126-007` | More than 20 percent of invited users cannot install or open app | Pause next invite wave and investigate build/install issue |
| `PAUSE-126-008` | More than 20 percent of invited users cannot log in/register | Pause next invite wave and investigate auth/OTP issue |
| `PAUSE-126-009` | Duplicate orders or duplicate parcel requests appear after submit protection | Pause affected flow and investigate |
| `PAUSE-126-010` | Vendor cannot receive or manage paid/mock-paid orders | Pause customer ordering until vendor flow is restored |
| `PAUSE-126-011` | Delivery Captain cannot accept/progress assigned jobs | Pause dispatch until Captain flow is restored |
| `PAUSE-126-012` | Support queue exceeds available coverage | Pause new customer invites until support catches up |
| `PAUSE-126-013` | Any suspected data privacy exposure occurs | Pause relevant flow and escalate immediately |

## Pause Procedure

1. Pilot Lead declares `Paused`.
2. Stop sending new invitations.
3. If needed, stop new customer order attempts for the pilot window.
4. Notify operations, support, dispatch and technical owners.
5. Record issue in the pilot issue register.
6. Identify affected participant group and app surface.
7. Decide whether current in-flight orders can continue safely.
8. Communicate safe next steps to affected participants.
9. Do not resume until resume criteria are met.

## Resume Criteria

| Area | Resume requirement |
| --- | --- |
| Technical issue | Root cause understood, fix applied or safe workaround approved |
| Participant safety | No active privacy, payment, delivery-code or access-control risk remains |
| Operations | Admin, vendor, dispatch and support owners are available |
| App access | Affected participants can install/open/login successfully |
| Payment mode | Mock payment confirmed |
| Disabled services | Live rides, payouts, wallet withdrawals/refunds and live utilities remain disabled |
| Decision | Pilot Lead records resume approval |

## Continue Wave Rules

| Wave | Continue condition | Maximum next action |
| --- | --- | --- |
| Vendor readiness | 3 pilot vendors ready | Invite Delivery Captains |
| Delivery Captain readiness | 3 Delivery Captains installed and login verified | Invite first 5 customers |
| Customer Wave 1 | No P0/P1 issue after first 5 customer installs/logins | Invite next 10 to 20 customers |
| Customer Wave 2 | At least one successful controlled order and support coverage stable | Invite remaining approved Batch 1 customers |
| Wider pilot | Daily closeout says Go | Continue next day only |

## Pause/Resume Log

| Date/time | Status | Trigger | Decision owner | Action taken | Resume condition | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `[DD Month YYYY, HH:MM]` | `Paused / Resumed / Continued` |  |  |  |  |  |
