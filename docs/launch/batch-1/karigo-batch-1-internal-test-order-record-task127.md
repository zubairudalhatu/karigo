# KariGO Batch 1 Internal Test Order Record - Task 127

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record the internal controlled test order that must pass before the first real
pilot customer order is allowed.

Use internal pilot/test accounts only. Do not record passwords, OTP values,
delivery codes, bearer tokens, private addresses, full phone numbers, payment
secrets, private APK links or unmasked screenshots.

## Internal Test Order Setup

| Item | Record |
| --- | --- |
| Test date/time | `[DD Month YYYY, HH:MM WAT]` |
| Test customer ID/masked reference | `[Customer-test-ref]` |
| Test vendor ID/reference | `[Vendor-test-ref]` |
| Test Delivery Captain ID/reference | `[Captain-test-ref]` |
| Operations admin | `[Name]` |
| Payment mode | `Mock payment` |
| Order reference | `[KGO-...]` |
| Evidence location | `[Secure reference outside Git]` |

## Internal Order Flow Checkpoints

| Step | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- |
| Customer App opens | App launches without crash |  | `Pending / Pass / Fail` |  |
| Customer login/registration works | Test customer reaches home |  | `Pending / Pass / Fail` | Do not record OTP |
| Vendor browse works | Test vendor/products visible |  | `Pending / Pass / Fail` |  |
| Cart works | Item added once; duplicate submit protection unaffected |  | `Pending / Pass / Fail` |  |
| Checkout quote works | Subtotal, delivery fee, discount and payable display |  | `Pending / Pass / Fail` |  |
| Mock payment works | Order becomes mock-paid |  | `Pending / Pass / Fail` | No live payment screen |
| Vendor Dashboard receives order | Vendor sees order |  | `Pending / Pass / Fail` |  |
| Vendor accepts/prepares order | Status progresses safely |  | `Pending / Pass / Fail` |  |
| Admin Portal sees order | Admin order view updates |  | `Pending / Pass / Fail` |  |
| Admin assigns Delivery Captain | Job appears in Captain App |  | `Pending / Pass / Fail` |  |
| Captain accepts job | Job status updates |  | `Pending / Pass / Fail` |  |
| Captain pickup flow works | Pickup progression succeeds |  | `Pending / Pass / Fail` |  |
| Captain delivery flow works | On-the-way/arrived/delivered progression succeeds |  | `Pending / Pass / Fail` |  |
| Customer delivery code reveal works | Code shown only to owning customer at eligible stage |  | `Pending / Pass / Fail` | Do not record code |
| Captain submits customer-provided code | Delivery completes safely |  | `Pending / Pass / Fail` | Do not record code |
| Admin verifies final order | Final status visible in Admin Portal |  | `Pending / Pass / Fail` |  |
| Vendor settlement visibility checked | Vendor read-only settlement view is consistent |  | `Pending / Pass / Fail` |  |
| Captain earnings visibility checked | Earnings display without payout activation |  | `Pending / Pass / Fail` |  |

## Internal Test Result

| Decision item | Record |
| --- | --- |
| Internal test order result | `Pass / Fail / Blocked` |
| Blocking issues | `None / Issue IDs` |
| Safe to allow first real pilot order | `Yes / No / Conditional` |
| Conditions |  |
| Approved by | `[Name]` |
| Approval date/time | `[DD Month YYYY, HH:MM WAT]` |
