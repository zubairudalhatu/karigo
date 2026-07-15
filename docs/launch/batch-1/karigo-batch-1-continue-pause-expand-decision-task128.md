# KariGO Batch 1 Continue/Pause/Expand Decision - Task 128

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record the formal decision after reviewing Batch 1 results and fix priorities.
This decision determines whether KariGO should continue the current batch, pause
for fixes or expand to more approved pilot customers.

This decision does not approve public launch or activate any disabled live
provider or service.

## Decision Inputs

| Input | Required status | Result | Notes |
| --- | --- | --- | --- |
| Batch 1 results review | Completed | `Pass / Fail / Blocked` |  |
| Fix prioritisation register | Reviewed | `Pass / Fail / Blocked` |  |
| Fix owner assignments | Owners assigned | `Pass / Fail / Blocked` |  |
| Open P0 issues | None required | `None / Issue IDs` |  |
| Open P1 issues | None required for expansion | `None / Issue IDs` |  |
| P2 workarounds | Approved if continuing | `Approved / Not approved / N/A` |  |
| Support capacity | Enough for next wave | `Pass / Fail / Blocked` |  |
| Vendor capacity | Enough for next wave | `Pass / Fail / Blocked` |  |
| Delivery Captain capacity | Enough for next wave | `Pass / Fail / Blocked` |  |
| Disabled-service guardrails | Still enforced | `Pass / Fail / Blocked` |  |

## Decision Options

| Decision | Meaning | Allowed next action |
| --- | --- | --- |
| `Continue current batch` | Keep serving existing invited users only | No new customer wave yet |
| `Expand Batch 1` | Invite the next approved customer wave | Send next controlled wave |
| `Conditional expand` | Invite a smaller wave under explicit conditions | Limited expansion only |
| `Pause for fixes` | Stop new invites until fixes/retests pass | Fix and retest |
| `Stop Batch 1` | Controlled pilot cannot continue safely | Escalate to management |

## Expansion Readiness Checklist

| Check | Required result | Status | Notes |
| --- | --- | --- | --- |
| Customer App stable | No blocking customer issue | `Pass / Fail / Conditional` |  |
| Vendor Dashboard stable | Vendors can receive/manage orders | `Pass / Fail / Conditional` |  |
| Admin Portal stable | Admin can monitor and dispatch | `Pass / Fail / Conditional` |  |
| KariGO Captain App stable | Delivery Captains can complete deliveries | `Pass / Fail / Conditional` |  |
| Support stable | Support can handle current volume | `Pass / Fail / Conditional` |  |
| Operations stable | Vendor/dispatch/admin owners available | `Pass / Fail / Conditional` |  |
| Mock payment stable | No live payment exposure | `Pass / Fail / Conditional` |  |
| Disabled services stable | Rides, payouts, utilities and wallet automation disabled | `Pass / Fail / Conditional` |  |

## Decision Record

| Decision item | Record |
| --- | --- |
| Decision | `Continue current batch / Expand Batch 1 / Conditional expand / Pause for fixes / Stop Batch 1` |
| Decision reason |  |
| Next wave size | `[Number / N/A]` |
| Next wave timing | `[DD Month YYYY, HH:MM WAT / N/A]` |
| Conditions |  |
| Fixes required before expansion |  |
| Communications required |  |
| Evidence location | `[Secure reference outside Git]` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM WAT]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Pilot Lead |  | `Approved / Not approved` |  |  |
| Operations Lead |  | `Approved / Not approved` |  |  |
| Dispatch Lead |  | `Approved / Not approved` |  |  |
| Support Lead |  | `Approved / Not approved` |  |  |
| Technical Lead |  | `Approved / Not approved` |  |  |
| Management Reviewer |  | `Approved / Not approved` |  |  |

## Public Launch Reminder

This decision applies only to controlled Batch 1 early access in Kano. It does
not approve public production launch, live payments, live rides, ride dispatch,
payout automation, wallet withdrawal/refund automation, Accelerate.ng utilities
or Pharmacy marketplace activation.
