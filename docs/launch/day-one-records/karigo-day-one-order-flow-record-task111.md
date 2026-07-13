# KariGO Day-One Order Flow Record - Task 111

## Purpose

Use this record to track Day-One pilot orders from customer creation through vendor
preparation, admin dispatch, Delivery Captain handoff, delivery completion and settlement
visibility review.

This is a safe operations record only. Do not record delivery OTP values, passwords,
full phone numbers, payment secrets, private addresses, API tokens, test card details or
unmasked customer data.

## Order Recording Rules

- Record only order references or masked identifiers.
- Record participant names only if the management team has approved that internal record
  practice; otherwise use assigned pilot participant IDs.
- The payment mode should be recorded as `Mock payment` for the first Kano pilot.
- Delivery code/OTP should be recorded only as `shown to customer`, `shared by customer`,
  `verified`, `failed` or `not attempted`. Never write the actual code.
- If a real safety issue occurs, open it in the Day-One issue and incident log.

## Day-One Order Table

| Order ref | Time created | Customer ID/masked ref | Vendor | Cart/subtotal | Delivery fee | Discount | Payable | Payment mode | Payment status | Vendor status | Captain assigned | Delivery status | OTP verification status | Final order status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[KGO-...]` | `[HH:MM]` | `[Customer-01]` | `[Vendor]` | `NGN [ ]` | `NGN [ ]` | `NGN [ ]` | `NGN [ ]` | `Mock payment` |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  | `Mock payment` |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  | `Mock payment` |  |  |  |  |  |  |  |

## Order Flow Checkpoints

For each selected pilot order, tick the checkpoints that apply.

| Checkpoint | Order 1 | Order 2 | Order 3 | Notes |
| --- | --- | --- | --- | --- |
| Customer could browse vendor/products | `[ ]` | `[ ]` | `[ ]` |  |
| Customer added item to cart | `[ ]` | `[ ]` | `[ ]` |  |
| Checkout quote showed subtotal, delivery fee, discount and payable | `[ ]` | `[ ]` | `[ ]` |  |
| Mock payment completed | `[ ]` | `[ ]` | `[ ]` |  |
| Order appeared in Vendor Dashboard | `[ ]` | `[ ]` | `[ ]` |  |
| Vendor accepted order | `[ ]` | `[ ]` | `[ ]` |  |
| Vendor marked preparing | `[ ]` | `[ ]` | `[ ]` |  |
| Vendor marked ready for pickup | `[ ]` | `[ ]` | `[ ]` |  |
| Admin assigned Delivery Captain | `[ ]` | `[ ]` | `[ ]` |  |
| Delivery Captain accepted job | `[ ]` | `[ ]` | `[ ]` |  |
| Delivery Captain completed pickup flow | `[ ]` | `[ ]` | `[ ]` |  |
| Customer saw delivery code only at eligible stage | `[ ]` | `[ ]` | `[ ]` | Do not record code |
| Delivery Captain submitted customer-provided code | `[ ]` | `[ ]` | `[ ]` | Do not record code |
| Order status became completed | `[ ]` | `[ ]` | `[ ]` |  |
| Admin Portal reflected final order status | `[ ]` | `[ ]` | `[ ]` |  |
| Vendor settlement visibility reviewed | `[ ]` | `[ ]` | `[ ]` |  |
| Captain earnings visibility reviewed | `[ ]` | `[ ]` | `[ ]` |  |

## Exception Record

| Order ref | Exception type | What happened | Immediate action | Owner | Status | Follow-up issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| `[KGO-...]` | `Payment / Vendor / Dispatch / Captain / Customer / Technical` |  |  |  | `Open / Closed` |  |
|  |  |  |  |  |  |  |

## First Successful End-To-End Order

| Item | Record |
| --- | --- |
| Order reference | `[KGO-...]` |
| Time completed | `[HH:MM]` |
| Vendor | `[Vendor name or ID]` |
| Delivery Captain | `[Captain ID]` |
| Payment mode | `Mock payment` |
| OTP/code verification outcome | `Verified / Failed / Not attempted` |
| Admin verification completed by | `[Name]` |
| Notes |  |

