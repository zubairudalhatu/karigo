# Task 151 - Google Play Tester Install Results

Date: 2026-07-17

## Purpose

Provide the tester install result template and closed testing checklist for KariGO Customer App and KariGO Captain App after Google Play internal or closed testing upload.

Do not record private tester emails, phone numbers, OTPs, payment references, direct artifact URLs, Play Console screenshots or sensitive account details in this file.

## Tester Install Result Template

| Field | Value |
| --- | --- |
| Tester code/name |  |
| App tested | Customer App / KariGO Captain App |
| Device model |  |
| Android version |  |
| Install source | Google Play Internal testing / Google Play Closed testing |
| Build ID |  |
| Installation status | Passed / Failed / Blocked |
| First launch status | Passed / Failed / Blocked |
| Login/register status | Passed / Failed / Blocked |
| Main scenario tested |  |
| Result | Passed / Failed / Blocked |
| Issue summary |  |
| Severity | P0 / P1 / P2 / P3 |
| Screenshot/video reference |  |
| Owner |  |
| Resolution status | Open / In progress / Fixed / Retested / Accepted |

## Customer App Closed Testing Checklist

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from testing link | App installs from Google Play testing link | Pending |
| Open app | App launches without crash | Pending |
| Create/login account | Account flow works through approved auth path | Pending |
| Add address | Address can be added or selected | Pending |
| Browse vendors/products | Vendor and product surfaces load | Pending |
| Add to cart | Product can be added without duplicate submission | Pending |
| Checkout quote | Server quote displays subtotal, delivery fee, discount and payable total | Pending |
| Mock payment | Mock payment remains available as fallback | Pending |
| Monnify Sandbox | Sandbox flow starts or safe error is recorded | Pending |
| Paystack Test Mode | Test mode flow starts or safe error is recorded | Pending |
| Order history/detail | Order appears with correct status and totals | Pending |
| SME Services request | Request can be submitted safely | Pending |
| SME Services tracking | Request appears in history/detail | Pending |
| Profile/support/legal links | Links are visible and open correctly | Pending |
| Logout | Session clears safely | Pending |

## KariGO Captain App Closed Testing Checklist

Current Captain build for new closed-testing installs: `79123804-7a58-45ad-807e-d9d87dffea1f`.

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from testing link | App installs from Google Play testing link | Pending |
| Login | Delivery Captain login works | Pending |
| Availability toggle | Availability status updates safely | Pending |
| Assigned order visibility | Assigned delivery appears when dispatched | Pending |
| Pickup flow | Pickup steps can be progressed | Pending |
| Delivery OTP completion | Customer-provided delivery code completes delivery | Pending |
| Completed order status | Completion syncs across platform surfaces | Pending |
| Earnings/settlement display | Earnings/settlement area is safe if available | Pending |
| Support/logout | Support and logout work correctly | Pending |

## Payment Testing Rules

- Live payments remain disabled.
- No real customer charges should be collected.
- Squad by GTBank is the primary launch payment candidate but is not live until environment verification and approval are complete.
- Monnify and Paystack remain pending approval and are sandbox/test only.
- Mock payment remains staging/testing fallback only.
- Payment failures must be recorded with app, device, time, selected provider, expected result, actual result and safe screenshot/reference.

## Current Result Summary

```text
Customer tester installs: Pending
Captain tester installs: Pending
Closed testing links: Pending operator evidence
Production publishing: Not approved
Live payments: Disabled
```
