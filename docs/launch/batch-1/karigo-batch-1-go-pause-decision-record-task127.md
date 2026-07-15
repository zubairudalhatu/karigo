# KariGO Batch 1 Go/Pause Decision Record - Task 127

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record the formal Go/Pause decision after Batch 1 activation, the internal test
order and the first real pilot order.

This decision controls whether KariGO may expand to the next customer wave. It
does not approve public launch or activate any disabled provider or service.

## Decision Inputs

| Input | Required evidence | Result | Notes |
| --- | --- | --- | --- |
| Activation checklist completed | `karigo-batch-1-activation-execution-record-task127.md` | `Pass / Fail / Blocked` |  |
| Internal test order completed | `karigo-batch-1-internal-test-order-record-task127.md` | `Pass / Fail / Blocked` |  |
| First real pilot order completed | `karigo-batch-1-first-real-pilot-order-record-task127.md` | `Pass / Fail / Blocked` |  |
| Issue log reviewed | `karigo-batch-1-issue-observation-log-task127.md` | `Pass / Fail / Blocked` |  |
| Open P0 issues | None required | `None / Issue IDs` |  |
| Open P1 issues | None required before expansion | `None / Issue IDs` |  |
| Support coverage | Active and stable | `Pass / Fail / Blocked` |  |
| Dispatch coverage | Active and stable | `Pass / Fail / Blocked` |  |
| Vendor readiness | At least 3 vendors active | `Pass / Fail / Blocked` |  |
| Delivery Captain readiness | At least 3 Delivery Captains active | `Pass / Fail / Blocked` |  |

## Continue Criteria

The team may continue to the next customer wave only if:

- internal test order passes;
- first real pilot order passes or has only non-blocking P2/P3 observations;
- no open P0/P1 issue remains;
- mock payment remains the only active pilot payment mode;
- live rides and ride dispatch remain disabled;
- payout automation and wallet withdrawal/refund automation remain disabled;
- support, dispatch and technical coverage remain available.

## Decision Options

| Decision | Meaning | Allowed next action |
| --- | --- | --- |
| `Go` | Activation and first order passed | Invite next approved customer wave |
| `Conditional Go` | Minor issues exist with approved workaround | Invite limited next wave under conditions |
| `Pause` | Blocking issue or operational risk exists | Stop new invites until issue is resolved |
| `No-Go` | Pilot cannot safely continue | Stop Batch 1 and escalate to management |

## Decision Record

| Decision item | Record |
| --- | --- |
| Decision | `Go / Conditional Go / Pause / No-Go` |
| Decision reason |  |
| Conditions |  |
| Next customer wave size | `[Number]` |
| Next invite time | `[DD Month YYYY, HH:MM WAT]` |
| Required follow-up before next wave |  |
| Pilot Lead | `[Name]` |
| Operations Lead | `[Name]` |
| Dispatch Lead | `[Name]` |
| Technical Lead | `[Name]` |
| Support Lead | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM WAT]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Pilot Lead |  | `Approved / Not approved` |  |  |
| Operations Lead |  | `Approved / Not approved` |  |  |
| Dispatch Lead |  | `Approved / Not approved` |  |  |
| Technical Lead |  | `Approved / Not approved` |  |  |
| Support Lead |  | `Approved / Not approved` |  |  |

## Public Launch Reminder

This record does not approve broad public soft launch or production launch. It
only records whether Batch 1 may continue to the next controlled Kano customer
wave.
