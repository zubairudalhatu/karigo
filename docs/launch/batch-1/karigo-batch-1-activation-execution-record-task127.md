# KariGO Batch 1 Activation Execution Record - Task 127

Date prepared: 2026-07-15
Pilot location: Kano
Batch: Batch 1 controlled early access

## Purpose

Use this record to capture the actual Batch 1 activation steps before expanding
KariGO early access to more pilot customers.

Task 126 prepared the Batch 1 invitation execution pack. Task 127 records the
activation steps, internal test order, first real pilot order, issue observations
and Go/Pause decision.

This is a launch operations documentation record only. It does not activate live
Paystack, live Monnify, live Squad, Accelerate.ng utilities, wallet withdrawals,
automatic refunds, live rides, ride dispatch, payouts, Pharmacy marketplace,
provider login, marketing SMS, promotional email, newsletter email or bulk
SMS/email.

## Current Launch Status

| Area | Status |
| --- | --- |
| Customer App APK | Ready |
| KariGO Captain APK | Ready |
| Vendor Dashboard | Ready |
| Admin Portal | Ready |
| Batch 1 invitation pack | Ready |
| Payment mode | Mock payment |
| Paystack/Monnify/Squad | Sandbox only, not active for pilot |
| Accelerate.ng | Inactive |
| KariGO Rides | Readiness-only |
| Live rides | Disabled |
| Payout automation | Disabled |
| Wallet withdrawal/refund automation | Disabled |

## Activation Safety Rules

- Record only masked references and assigned participant IDs.
- Do not record passwords, OTP values, delivery codes, bearer tokens, provider
  keys, private APK links, full phone numbers, private addresses, bank details or
  unmasked screenshots.
- Payment mode for Batch 1 must remain `Mock payment`.
- Do not invite additional customers until the expand/pause decision is recorded.
- If a P0/P1 issue appears, pause activation and use
  `karigo-batch-1-go-pause-decision-record-task127.md`.
- Store detailed screenshots, APK links and private participant evidence outside
  Git in the approved secure evidence location.

## Activation Command Centre

| Role | Assigned owner | Backup | Ready before activation | Notes |
| --- | --- | --- | --- | --- |
| Pilot Lead | `[Name]` | `[Name]` | `Pending / Yes / No` |  |
| Operations Admin | `[Name]` | `[Name]` | `Pending / Yes / No` |  |
| Dispatch Lead | `[Name]` | `[Name]` | `Pending / Yes / No` |  |
| Support Lead | `[Name]` | `[Name]` | `Pending / Yes / No` |  |
| Technical Lead | `[Name]` | `[Name]` | `Pending / Yes / No` |  |
| Vendor Coordinator | `[Name]` | `[Name]` | `Pending / Yes / No` |  |

## Activation Timeline

| Time | Step | Owner | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `[HH:MM]` | Open activation room/channel | Pilot Lead | All owners present |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm backend health | Technical Lead | Health endpoint responds |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm Admin Portal access | Operations Admin | Admin login works |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm Vendor Dashboard access | Vendor Coordinator | Batch 1 vendors can log in |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm Customer App APK | Support Lead | Customer app opens and logs in/registers |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm KariGO Captain APK | Dispatch Lead | Captain app opens and logs in |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Confirm mock payment mode | Technical Lead | No live payment screen appears |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Run internal test order | Operations Admin | End-to-end test completes |  | `Pending / Pass / Fail` | Use linked internal test order record |
| `[HH:MM]` | Approve first real pilot order | Pilot Lead | First real customer may order |  | `Pending / Pass / Fail` |  |
| `[HH:MM]` | Review first real pilot order | Pilot Lead | Go/Pause decision recorded |  | `Pending / Pass / Fail` | Use linked decision record |

## Activation Checklist

| Check | Required result | Status | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| Batch 1 vendor roster ready | At least 3 vendors ready | `Pending / Pass / Fail` |  |  |
| Batch 1 Delivery Captain roster ready | At least 3 Delivery Captains ready | `Pending / Pass / Fail` |  |  |
| First customer wave approved | Initial wave size approved | `Pending / Pass / Fail` |  |  |
| Support channel active | Support owner online | `Pending / Pass / Fail` |  |  |
| Dispatch coverage active | Dispatch owner online | `Pending / Pass / Fail` |  |  |
| Issue log open | Issue owner ready to record observations | `Pending / Pass / Fail` |  |  |
| Pause rules reviewed | Team reviewed pause/continue rules | `Pending / Pass / Fail` |  |  |
| APK links controlled | No public APK link sharing | `Pending / Pass / Fail` |  |  |
| Disabled services confirmed | Rides, payouts, utilities and wallet automation disabled | `Pending / Pass / Fail` |  |  |

## Activation Result

| Decision item | Record |
| --- | --- |
| Internal test order completed | `Yes / No / Blocked` |
| First real pilot order completed | `Yes / No / Blocked` |
| Open P0/P1 issues | `No / Yes - issue IDs` |
| Customer wave expansion decision | `Go / Conditional Go / Pause / No-Go` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM WAT]` |

## Related Documents

- `karigo-batch-1-internal-test-order-record-task127.md`
- `karigo-batch-1-first-real-pilot-order-record-task127.md`
- `karigo-batch-1-issue-observation-log-task127.md`
- `karigo-batch-1-go-pause-decision-record-task127.md`
- `../invitations/karigo-pilot-batch-1-invitation-execution-pack-task126.md`
- `../invitations/karigo-pilot-batch-1-pause-continue-rules-task126.md`
