# KariGO Soft Launch Day-One Execution Script - Task 104

Date prepared: 2026-07-13

## Purpose

Run the first supervised Kano soft launch order with all key role owners present.

## Preflight

| Check | Expected result | Status | Owner |
| --- | --- | --- | --- |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` responds | Pending | Technical Lead |
| Admin Portal | `https://admin.karigo.com.ng` loads and admin logs in | Pending | Admin tester |
| Vendor Dashboard | `https://vendor.karigo.com.ng` loads and pilot vendor logs in | Pending | Vendor tester |
| Customer App | Current staging build/update opens and customer logs in | Pending | Customer tester |
| KariGO Captain App | Current staging build/update opens and Delivery Captain logs in | Pending | Captain tester |
| Mock providers | Payment, OTP and notifications remain mock/staging-safe | Pending | Technical Lead |
| Evidence recorder | Evidence sheet/log is ready with masking rules | Pending | QA Lead |

## Execution Flow

| Step | Actor | Action | Expected result | Evidence reference |
| --- | --- | --- | --- | --- |
| 1 | Customer | Open app and browse vendor | Vendor/product catalogue visible |  |
| 2 | Customer | Add item to cart and open checkout | Server-authoritative pricing visible |  |
| 3 | Customer | Create order | Order reference created |  |
| 4 | Customer | Complete mock payment or approved Paystack Test Mode | Payment status updates only after backend verification |  |
| 5 | Vendor | Open paid order | Vendor sees its own paid order only |  |
| 6 | Vendor | Accept and mark preparing | Status updates in Admin |  |
| 7 | Vendor | Mark ready for pickup | Order ready for dispatch |  |
| 8 | Admin | Assign Delivery Captain | Captain receives assigned job |  |
| 9 | Delivery Captain | Accept job | Order progresses to accepted/assigned stage |  |
| 10 | Delivery Captain | Progress pickup and on-the-way statuses | Customer/Admin status updates |  |
| 11 | Customer | Reveal delivery code only at eligible status | Safety copy visible; code not recorded |  |
| 12 | Delivery Captain | Complete delivery using customer-supplied code | Order becomes completed |  |
| 13 | Admin | Verify final order, history and reports | Final state is consistent |  |
| 14 | Vendor | Check settlement visibility | Read-only settlement appears when eligible |  |
| 15 | Support/Admin | Create or review support note if needed | Support path works |  |

## Stop Conditions

Stop immediately if:

- order is marked paid without backend verification;
- Delivery Captain can see the delivery code;
- vendor/admin can see the delivery code;
- wrong vendor/customer data is visible;
- login/session blocks a core role;
- live provider is triggered unexpectedly;
- any secret, OTP, delivery code or token appears in evidence.

## Day-One Signoff

| Field | Value |
| --- | --- |
| Date/time |  |
| Order reference |  |
| Vendor |  |
| Delivery Captain |  |
| Payment mode | Mock / Approved Paystack Test Mode |
| Final order status |  |
| P0/P1 issues | Yes / No |
| Recommendation | Continue / Continue with conditions / Pause / Stop |
| Pilot Lead |  |
| QA Lead |  |

