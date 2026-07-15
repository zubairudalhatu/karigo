# KariGO Batch 1 First Real Pilot Order Record - Task 127

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record the first real Batch 1 pilot customer order after the internal test order
has passed.

Use masked participant references only. Do not record passwords, OTP values,
delivery codes, bearer tokens, private addresses, full phone numbers, payment
secrets, private APK links, bank details or unmasked screenshots.

## First Real Pilot Order Setup

| Item | Record |
| --- | --- |
| Order date/time | `[DD Month YYYY, HH:MM WAT]` |
| Customer ID/masked reference | `[C-B1-...]` |
| Vendor ID/reference | `[V-B1-...]` |
| Delivery Captain ID/reference | `[DC-B1-...]` |
| Operations admin | `[Name]` |
| Dispatch officer | `[Name]` |
| Payment mode | `Mock payment` |
| Order reference | `[KGO-...]` |
| Evidence location | `[Secure reference outside Git]` |

## First Real Order Metrics

| Metric | Record |
| --- | --- |
| Cart subtotal | `NGN [ ]` |
| Delivery fee | `NGN [ ]` |
| Discount | `NGN [ ]` |
| Payable | `NGN [ ]` |
| Order created time | `[HH:MM]` |
| Vendor accepted time | `[HH:MM]` |
| Vendor ready time | `[HH:MM]` |
| Captain assigned time | `[HH:MM]` |
| Pickup confirmed time | `[HH:MM]` |
| Arrived destination time | `[HH:MM]` |
| Delivered time | `[HH:MM]` |
| Delivery code verified time | `[HH:MM]` |
| Completed time | `[HH:MM]` |
| Total elapsed time | `[Minutes]` |

## First Real Order Flow

| Step | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- |
| Customer browses app | Home/vendor flow works |  | `Pending / Pass / Fail` |  |
| Customer creates cart | Cart updates correctly |  | `Pending / Pass / Fail` |  |
| Checkout quote shows correct totals | Subtotal, delivery fee, discount and payable display |  | `Pending / Pass / Fail` |  |
| Mock payment completes | Order is paid through mock flow only |  | `Pending / Pass / Fail` | No live payment |
| Vendor sees order | Vendor Dashboard receives order |  | `Pending / Pass / Fail` |  |
| Vendor accepts/prepares/ready | Vendor statuses update |  | `Pending / Pass / Fail` |  |
| Admin assigns Delivery Captain | Assignment is visible to Captain |  | `Pending / Pass / Fail` |  |
| Captain accepts and picks up | Captain App progression works |  | `Pending / Pass / Fail` |  |
| Captain reaches destination | Status progression reaches eligible delivery-code stage |  | `Pending / Pass / Fail` |  |
| Customer reveals delivery code | Code is visible only to owning customer |  | `Pending / Pass / Fail` | Do not record code |
| Captain submits delivery code | Order completes |  | `Pending / Pass / Fail` | Do not record code |
| Admin final verification | Admin Portal reflects final status |  | `Pending / Pass / Fail` |  |
| Vendor settlement visibility | Vendor settlement record is visible if eligible |  | `Pending / Pass / Fail` |  |
| Captain earnings visibility | Captain earnings appear without payout activation |  | `Pending / Pass / Fail` |  |

## Participant Feedback

| Participant | Feedback summary | Severity | Follow-up |
| --- | --- | --- | --- |
| Customer |  | `P0 / P1 / P2 / P3 / None` |  |
| Vendor |  | `P0 / P1 / P2 / P3 / None` |  |
| Delivery Captain |  | `P0 / P1 / P2 / P3 / None` |  |
| Operations/Admin |  | `P0 / P1 / P2 / P3 / None` |  |

## First Real Order Result

| Decision item | Record |
| --- | --- |
| First real pilot order result | `Pass / Fail / Blocked` |
| Blocking issues | `None / Issue IDs` |
| Customer wave expansion recommendation | `Go / Conditional Go / Pause / No-Go` |
| Conditions |  |
| Approved by | `[Name]` |
| Approval date/time | `[DD Month YYYY, HH:MM WAT]` |
