# Customer App Staging Test Evidence

Do not include passwords, OTP values, bearer tokens, full phone numbers, private device
identifiers, or screenshots containing sensitive data.

| Field | Value |
| --- | --- |
| Test ID |  |
| Device type |  |
| Android version |  |
| App version/build number |  |
| Environment | Private staging |
| Tester |  |
| Scenario |  |
| Expected result |  |
| Actual result |  |
| Status | Passed / Failed / Blocked |
| Screenshot reference | Store masked evidence outside Git |
| Issue ID |  |
| Notes |  |

## Completed Live Staging Evidence Summary

| Area | Result | Notes |
| --- | --- | --- |
| Customer browse/cart/checkout | Passed | Customer browsed Kano Kitchen and added Chicken Suya |
| Promo application | Passed with defect fixed | `KARIGOFIRST` applied NGN 300; UI now clears stale promo state before revalidation |
| Mock payment | Passed | Paid order visible to customer after mock verification |
| Vendor handoff | Passed | Vendor Dashboard received the paid order |
| Admin visibility | Passed | Admin Portal reflected order, GMV, delivery fee, and support activity |
| Navigation headers | Fixed | Route names replaced with customer-facing titles |
| Checkout/order pricing | Fixed | Subtotal, delivery fee, discount, and payable are shown from backend quote/order fields |
| Support refresh | Fixed | Created tickets appear immediately and list refreshes on focus/pull |
