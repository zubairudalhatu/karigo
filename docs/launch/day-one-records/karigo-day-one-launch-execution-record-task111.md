# KariGO Day-One Pilot Launch Execution Record - Task 111

## Purpose

This record is the live operating document for KariGO's first controlled early access
pilot day in Kano. The operations team should use it to record what happened, who was
on duty, when decisions were made, and whether the pilot stayed within approved limits.

This document is for launch operations and reporting only. It does not activate live
Paystack, Paystack Test Mode as default, Accelerate.ng utilities, Termii SMS, wallet
withdrawals, automatic refunds, live rides, ride dispatch, payouts, Pharmacy marketplace
or provider login.

## Pilot Setup

| Item | Day-One Record |
| --- | --- |
| Pilot location | Kano |
| Pilot date | `[DD Month YYYY]` |
| Pilot window | `[Start time]` to `[End time]` |
| Pilot vendors | `3-5 approved pilot vendors` |
| Pilot customers | `20-50 controlled early access customers` |
| Delivery Captains | `3-5 approved Delivery Captains` |
| Operations admins | `2-3 assigned admins` |
| Initial payment mode | `Mock payment` |
| Customer App build/update | `[Build or update reference]` |
| KariGO Captain App build/update | `[Build or update reference]` |
| Admin Portal domain | `https://admin.karigo.com.ng` |
| Vendor Dashboard domain | `https://vendor.karigo.com.ng` |
| Backend health endpoint | `https://karigo-8htn.onrender.com/api/v1/health` |

## Security And Data Rules

- Do not record passwords, OTP values, access tokens, API keys, test cards, webhook
  secrets, private phone numbers, private addresses or screenshots containing sensitive
  data in this document.
- Use order references, participant IDs, masked phone numbers or initials where needed.
- Delivery OTP/code handoff may be recorded as `completed`, `failed` or `not attempted`,
  but the actual code must never be written here.
- Payment mode for Day One is mock payment unless management separately approves a
  different mode in a later task.
- Any accidental exposure of sensitive data must be escalated immediately and removed
  from shared records.

## Day-One Team Roster

| Role | Assigned person | Backup | Contact method | On duty window | Notes |
| --- | --- | --- | --- | --- | --- |
| Management lead | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Operations lead | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Dispatch officer | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Support officer | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Technical lead | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Vendor coordinator | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |
| Captain coordinator | `[Name]` | `[Name]` | `[Manual channel]` | `[Time]` |  |

## Pre-Start Verification

Complete this before the first pilot customer is invited to place an order.

| Check | Owner | Result | Time | Notes |
| --- | --- | --- | --- | --- |
| Backend health endpoint responds | Technical lead | `Pass / Fail / Blocked` |  |  |
| Admin Portal login works | Operations lead | `Pass / Fail / Blocked` |  |  |
| Vendor Dashboard login works | Vendor coordinator | `Pass / Fail / Blocked` |  |  |
| Customer App opens and reaches homepage | Support officer | `Pass / Fail / Blocked` |  |  |
| KariGO Captain App login works | Captain coordinator | `Pass / Fail / Blocked` |  |  |
| Mock payment is confirmed as selected mode | Technical lead | `Pass / Fail / Blocked` |  |  |
| Paystack live mode is not active | Technical lead | `Pass / Fail / Blocked` |  |  |
| Live utilities/SMS/rides/payouts are inactive | Technical lead | `Pass / Fail / Blocked` |  |  |
| Pilot vendors confirm readiness | Vendor coordinator | `Pass / Fail / Blocked` |  |  |
| Delivery Captains confirm availability | Captain coordinator | `Pass / Fail / Blocked` |  |  |
| Support escalation channel is open | Support officer | `Pass / Fail / Blocked` |  |  |
| Day-One issue log is open | Operations lead | `Pass / Fail / Blocked` |  |  |

## Launch Start Decision

| Decision item | Record |
| --- | --- |
| Start decision | `Go / Conditional Go / Delay / No-Go` |
| Decision time | `[HH:MM]` |
| Decision owner | `[Name]` |
| Conditions, if any | `[Condition list]` |
| First customer cohort released | `Yes / No` |
| Notes |  |

## Live Execution Timeline

Record material events as they happen. Use the separate order, issue, communication and
metrics records for detail.

| Time | Event type | Summary | Owner | Status | Follow-up needed |
| --- | --- | --- | --- | --- | --- |
| `[HH:MM]` | `Launch / Order / Support / Dispatch / Technical / Decision` |  |  | `Open / Closed` |  |
| `[HH:MM]` |  |  |  |  |  |
| `[HH:MM]` |  |  |  |  |  |

## Decision Log

| Time | Decision | Reason | Approved by | Impact | Follow-up |
| --- | --- | --- | --- | --- | --- |
| `[HH:MM]` |  |  |  |  |  |
| `[HH:MM]` |  |  |  |  |  |

## Pause Or Stop Conditions

Pause new pilot orders and notify management if any of these occur:

- Backend API unavailable or unstable for more than the agreed tolerance window.
- Admin Portal, Vendor Dashboard, Customer App or KariGO Captain App cannot support
  the active order flow.
- Mock payment flow cannot complete safely.
- A customer, vendor or Delivery Captain safety issue is reported.
- A P0/P1 incident is opened and not controlled.
- Support cannot respond within the Day-One target window.
- Management lead instructs a pause.

## Day-One Record Links

- Order flow record: `karigo-day-one-order-flow-record-task111.md`
- Issue and incident log: `karigo-day-one-issue-and-incident-log-task111.md`
- Communications record: `karigo-day-one-communications-record-task111.md`
- Metrics snapshot: `karigo-day-one-metrics-snapshot-task111.md`
- Closeout and next-day decision: `karigo-day-one-closeout-and-next-day-decision-task111.md`

