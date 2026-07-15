# KariGO Batch 1 Internal Order Live Signoff - Task 129

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record live signoff for the internal order that must pass before the first real
pilot customer order is allowed.

Do not invent results. Fill this only while or after the internal order is
executed with real evidence stored securely outside Git.

## Safety Rules

- Payment mode must remain `Mock payment`.
- Do not record passwords, OTP values, delivery codes, full phone numbers,
  private addresses, bearer tokens, provider keys or unmasked screenshots.
- Do not approve the first real pilot order if this internal order exposes a P0
  or unresolved P1 issue.

## Internal Order Identity

| Item | Record |
| --- | --- |
| Execution date/time | `[DD Month YYYY, HH:MM WAT]` |
| Internal customer reference | `[Masked/internal ID]` |
| Vendor reference | `[V-B1-...]` |
| Delivery Captain reference | `[DC-B1-...]` |
| Admin/dispatch owner | `[Name]` |
| Order reference | `[KGO-...]` |
| Payment mode | `Mock payment` |
| Evidence location | `[Secure reference outside Git]` |

## Live Execution Checklist

| Step | Expected result | Actual result | Status | Signoff owner |
| --- | --- | --- | --- | --- |
| Customer App opens | App works on test device |  | `Pass / Fail / Blocked` |  |
| Customer login/registration works | Internal customer reaches home |  | `Pass / Fail / Blocked` |  |
| Vendor browse/product selection works | Vendor/products visible |  | `Pass / Fail / Blocked` |  |
| Cart and checkout work | Server quote is shown |  | `Pass / Fail / Blocked` |  |
| Mock payment completes | No live payment screen appears |  | `Pass / Fail / Blocked` |  |
| Vendor receives order | Vendor Dashboard shows order |  | `Pass / Fail / Blocked` |  |
| Vendor accepts and prepares | Vendor statuses progress |  | `Pass / Fail / Blocked` |  |
| Admin assigns Delivery Captain | Captain receives job |  | `Pass / Fail / Blocked` |  |
| Captain accepts job | Captain status updates |  | `Pass / Fail / Blocked` |  |
| Pickup/delivery progression works | Order reaches delivery-code stage |  | `Pass / Fail / Blocked` |  |
| Customer reveals delivery code | Code is visible only to owning customer |  | `Pass / Fail / Blocked` | Do not record code |
| Captain submits customer-provided code | Order completes |  | `Pass / Fail / Blocked` | Do not record code |
| Admin verifies final status | Admin Portal reflects completion |  | `Pass / Fail / Blocked` |  |
| Settlement/earnings visibility checked | Records are visible without payout activation |  | `Pass / Fail / Blocked` |  |

## Internal Order Issues

| Issue ID | Severity | Summary | Immediate action | Owner | Blocks first real order |
| --- | --- | --- | --- | --- | --- |
| `INT129-001` | `P0 / P1 / P2 / P3` |  |  |  | `Yes / No` |
| `INT129-002` |  |  |  |  |  |

## Internal Order Signoff

| Decision item | Record |
| --- | --- |
| Internal order result | `Pass / Fail / Blocked` |
| Safe to proceed to first real pilot order | `Yes / No / Conditional` |
| Conditions before proceeding |  |
| Approved by Pilot Lead | `[Name / Not approved]` |
| Approved by Technical Lead | `[Name / Not approved]` |
| Approved by Operations Lead | `[Name / Not approved]` |
| Signoff date/time | `[DD Month YYYY, HH:MM WAT]` |
