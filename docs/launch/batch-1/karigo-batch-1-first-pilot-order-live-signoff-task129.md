# KariGO Batch 1 First Pilot Order Live Signoff - Task 129

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record live signoff for the first real Batch 1 pilot customer order.

Do not invent results. Fill this only while or after the first real pilot order
is executed with real evidence stored securely outside Git.

## Safety Rules

- Payment mode must remain `Mock payment`.
- Do not record passwords, OTP values, delivery codes, full phone numbers,
  private addresses, bearer tokens, provider keys, bank details or unmasked
  screenshots.
- Use assigned Batch 1 participant IDs or masked references only.
- Do not expand to more customers until this signoff and the operations signoff
  are completed.

## First Pilot Order Identity

| Item | Record |
| --- | --- |
| Execution date/time | `[DD Month YYYY, HH:MM WAT]` |
| Customer reference | `[C-B1-...]` |
| Vendor reference | `[V-B1-...]` |
| Delivery Captain reference | `[DC-B1-...]` |
| Admin/dispatch owner | `[Name]` |
| Support owner | `[Name]` |
| Order reference | `[KGO-...]` |
| Payment mode | `Mock payment` |
| Evidence location | `[Secure reference outside Git]` |

## Live Order Timeline

| Time | Event | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| `[HH:MM]` | Customer starts order | Customer can browse and add item |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Checkout quote shown | Subtotal, delivery fee, discount and payable show |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Mock payment completed | Order becomes mock-paid |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Vendor receives order | Vendor Dashboard shows order |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Vendor accepts/prepares | Vendor workflow works |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Admin assigns Captain | Captain receives job |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Captain accepts job | Job status updates |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Captain completes pickup | Pickup status updates |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Captain reaches destination | Customer can reveal code at eligible stage |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Captain submits code | Order completes |  | `Pass / Fail / Blocked` |
| `[HH:MM]` | Admin verifies final status | Order status is final and consistent |  | `Pass / Fail / Blocked` |

## Participant Experience Notes

| Participant | Experience summary | Issue ID if any | Notes |
| --- | --- | --- | --- |
| Customer |  |  |  |
| Vendor |  |  |  |
| Delivery Captain |  |  |  |
| Admin/Dispatch |  |  |  |
| Support |  |  |  |

## First Order Issues

| Issue ID | Severity | Summary | Immediate action | Owner | Blocks expansion |
| --- | --- | --- | --- | --- | --- |
| `REAL129-001` | `P0 / P1 / P2 / P3` |  |  |  | `Yes / No` |
| `REAL129-002` |  |  |  |  |  |

## First Pilot Order Signoff

| Decision item | Record |
| --- | --- |
| First real pilot order result | `Pass / Fail / Blocked` |
| Open P0/P1 issues | `No / Yes - issue IDs` |
| Safe to consider customer wave expansion | `Yes / No / Conditional` |
| Conditions before expansion |  |
| Approved by Pilot Lead | `[Name / Not approved]` |
| Approved by Technical Lead | `[Name / Not approved]` |
| Approved by Operations Lead | `[Name / Not approved]` |
| Approved by Support Lead | `[Name / Not approved]` |
| Signoff date/time | `[DD Month YYYY, HH:MM WAT]` |
