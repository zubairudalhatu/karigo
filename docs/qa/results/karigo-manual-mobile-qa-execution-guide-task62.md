# KariGO Manual Mobile QA Execution Guide - Task 62

Date: 10 July 2026
Environment: Live staging

Use this guide to execute the remaining credentialed Customer/Rider/Vendor/Admin QA required before controlled soft launch. This is a manual QA guide; it does not activate live providers or add new product features.

## Preflight

Before testing:

- Confirm backend health at `https://karigo-8htn.onrender.com/api/v1/health`.
- Confirm `/api/v1` returning `NOT_FOUND` is expected.
- Confirm Customer App uses EAS branch `customer-staging`.
- Confirm Rider App uses EAS branch `rider-staging`.
- Confirm Customer and Rider apps point to `https://karigo-8htn.onrender.com/api/v1`.
- Confirm Admin Portal loads at `https://admin.karigo.com.ng`.
- Confirm Vendor Dashboard loads at `https://vendor.karigo.com.ng`.
- Confirm demo credentials are available through a secure channel.
- Confirm testers know not to record passwords, tokens or OTP values.

## Recommended Test Order

Run the flow in this order so each role sees the correct state transition.

### Part 1: Customer Setup And Order Creation

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Open Customer App | App loads without route-name leakage or crash | App version/build, no screenshot with credentials |
| 2 | Log in as Demo Customer | Customer reaches home screen | Pass/fail only |
| 3 | Confirm profile/address | Demo address is available or can be selected | Masked address area only |
| 4 | Browse Food/Grocery/Market vendors | Seeded vendors appear | Vendor names only |
| 5 | Open Kano Kitchen or another demo vendor | Products load | Product names and prices |
| 6 | Add product to cart | Cart updates correctly | Cart summary |
| 7 | Go to checkout | Server quote loads | Subtotal, delivery fee, discount, payable |
| 8 | Apply `KARIGOFIRST`, if eligible | Promo success or clear already-used message | Message text, no token |
| 9 | Create order | Order reference appears | Masked order reference |
| 10 | Complete mock payment | Order status becomes paid | Payment status, masked payment reference |
| 11 | Open order details | Totals match backend order | Pricing breakdown |

### Part 2: Vendor Acceptance

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Open Vendor Dashboard | Dashboard loads from branded domain | URL and role |
| 2 | Log in as matching Demo Vendor | Vendor dashboard opens | Pass/fail only |
| 3 | Open New Orders | Paid customer order appears | Masked order reference |
| 4 | Open order details | Items, payment status and address summary are visible | No customer secrets |
| 5 | Accept order | Status moves to accepted/preparing path | Status timestamp |
| 6 | Mark preparing | Status updates | Status label |
| 7 | Mark ready for pickup | Order becomes ready for dispatch | Status label |

### Part 3: Admin Dispatch And Oversight

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Open Admin Portal | Admin branded domain loads | URL and role |
| 2 | Log in as Super Admin or Operations Admin | Dashboard opens | Pass/fail only |
| 3 | Open Live Orders | Test order appears | Masked order reference |
| 4 | Open Dispatch Board | Ready order and available rider are visible | No private user data |
| 5 | Assign Demo Rider | Rider assignment succeeds | Assignment status |
| 6 | Check reports/dashboard | GMV/order metrics update or remain understandable | Summary only |
| 7 | Check support view later | Customer ticket appears if created | Masked ticket reference |

### Part 4: Rider Delivery

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Open Rider App | App loads on staging build/channel | Build/channel |
| 2 | Log in as Demo Rider | Rider dashboard opens | Pass/fail only |
| 3 | Go online | Rider availability is online | Availability state |
| 4 | Open assigned jobs | Assigned order appears | Masked order reference |
| 5 | Accept job | Job moves to active flow | Status label |
| 6 | Mark arriving at pickup | Status updates | Status label |
| 7 | Mark picked up | Status updates | Status label |
| 8 | Mark on the way | Status updates | Status label |
| 9 | Mark arrived/delivered | Customer can reveal delivery code | Do not record OTP |
| 10 | Enter customer-supplied OTP | Delivery completes | Completed status only |

### Part 5: Customer Completion And Support

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Customer opens order details | Status shows arrived/delivered before completion | Status label |
| 2 | Customer taps show delivery code | Code is visible only to customer | Do not capture or write code |
| 3 | Customer confirms completed order | Order eventually shows completed | Status label |
| 4 | Customer creates support ticket | Ticket appears immediately in list | Masked ticket reference |
| 5 | Admin responds to ticket | Customer sees customer-safe update | No internal note content |
| 6 | Notifications checked | Relevant notifications appear | Notification title only |

### Part 6: Finance And Settlement Visibility

| Step | Action | Expected result | Evidence to record |
|---|---|---|---|
| 1 | Admin opens settlements | Vendor/rider settlement records are visible | Masked settlement reference |
| 2 | Vendor opens settlements | Vendor sees only own settlements | Amount/status only |
| 3 | Rider opens earnings | Rider sees earnings summary | Amount/status only |
| 4 | Admin marks eligible test settlement paid, if approved | Status updates correctly | Masked settlement reference |

## Pass/Fail Rules

Mark the flow as failed if any of these happen:

- Customer cannot log in.
- Server quote is missing delivery fee or allows stale pricing.
- Payment is marked paid without backend verification.
- Vendor cannot see paid order.
- Admin cannot assign rider.
- Rider cannot complete delivery with customer OTP.
- Customer OTP appears before eligible delivery state.
- Vendor/admin/rider can see the customer delivery OTP.
- Support internal notes appear to customer.
- Vendor can see another vendor's settlement.
- Any app crashes during the core path.

## Evidence Rules

Record:

- Masked order reference.
- Masked payment reference.
- Masked support ticket reference.
- Status names and timestamps.
- Build/channel identifiers.
- Pass/fail and short notes.

Do not record:

- Passwords.
- Bearer tokens.
- Raw OTP values.
- Full phone numbers for real testers.
- Provider secrets.
- Full customer address if it contains real details.
