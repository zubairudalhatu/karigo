# Task 155 - Squad Live Payment Verification

Date: 2026-07-17

## Purpose

Provide the QA record for verifying Squad by GTBank live checkout readiness before public payment launch.

This file must not contain Squad keys, webhook secrets, test card/bank details, customer private data, provider dashboard screenshots or direct credential values.

## Verification Scope

| Area | Expected result | Status |
| --- | --- | --- |
| Backend health | `/api/v1/health` responds | Pending |
| Admin Payment Readiness | Squad shows primary launch provider | Pending |
| Live gate | Missing config blocks live checkout safely | Pending |
| Render env | Required Squad variable names are present without exposing values | Pending |
| Customer checkout | Only Squad by GTBank is visible in live launch mode | Pending |
| Mock hidden | Mock payment is not visible in public live checkout | Pending |
| Monnify hidden | Monnify is hidden until approval | Pending |
| Paystack hidden | Paystack is hidden until approval | Pending |
| Authorization | Squad checkout opens from backend-returned URL | Pending |
| Verification | Backend verification marks payment successful only after Squad confirms payment | Pending |
| Webhook | Signed Squad webhook is accepted and invalid signature is rejected | Pending |
| Reconciliation | Payment reference, amount, currency and order match | Pending |
| Rollback | Backend can return to staging/mock mode if launch is paused | Pending |

## Test Transaction Procedure

Use only a finance/management-approved low-value live test.

1. Confirm `PAYMENTS_LIVE_ENABLED=true`.
2. Confirm `PAYMENTS_PROVIDER=squad`.
3. Confirm `SQUAD_MODE=live`.
4. Confirm `SQUAD_LIVE_ACTIVATION_APPROVED=true`.
5. Confirm Customer App build/update uses `EXPO_PUBLIC_PAYMENT_LAUNCH_MODE=squad_live`.
6. Create a test customer order.
7. Continue with Squad by GTBank.
8. Complete the provider checkout using approved test/live payment method.
9. Return to KariGO.
10. Tap Verify payment.
11. Confirm backend verification succeeds.
12. Confirm order moves to paid/vendor workflow.
13. Confirm Admin payment/order records match amount and reference.
14. Confirm Squad dashboard record matches the order reference.
15. Record reconciliation evidence outside Git.

## Evidence Template

| Field | Value |
| --- | --- |
| Test ID |  |
| Date/time |  |
| Environment |  |
| Operator |  |
| Provider | Squad by GTBank |
| Backend commit |  |
| Customer app build/update |  |
| Order reference |  |
| Payment reference |  |
| Amount |  |
| Currency | NGN |
| Authorization opened | Passed / Failed / Blocked |
| Backend verification | Passed / Failed / Blocked |
| Webhook verification | Passed / Failed / Blocked |
| Reconciliation | Passed / Failed / Blocked |
| Result | Passed / Failed / Blocked |
| Issue summary |  |
| Reviewer approval |  |

Mask customer phone/email and do not include payment credentials.

## Rollback Verification

If live launch is paused:

- set backend back to `PAYMENTS_PROVIDER=mock`;
- set `PAYMENTS_LIVE_ENABLED=false`;
- remove/disable Customer live Squad launch mode;
- redeploy/publish the rollback update;
- confirm mock works in staging and public live checkout is paused.

## Current Result

```text
Squad live payment verification: Pending
Live payments: Prepared but not activated
Production public payment launch: Not approved by this document
```
