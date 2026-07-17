# Task 156 - Squad Low-Value Live Payment Test Record

Date: 2026-07-17

## Purpose

Provide the controlled evidence template for the first approved low-value Squad by GTBank live payment test.

This document must not contain card details, bank details, OTPs, authorization codes, provider keys, webhook secrets, customer private data, screenshots containing sensitive data, or direct artifact links with private access tokens.

## Preconditions

| Precondition | Required result | Status |
| --- | --- | --- |
| Finance/management approval | Recorded outside Git | Pending |
| Backend deployed with Task 155 | Confirm deployed commit | Pending |
| Render live variables configured | Squad variables set without exposing values | Pending |
| Admin Payment Readiness | Squad live checkout shows ready | Pending |
| Customer launch mode | Only Squad by GTBank visible | Pending |
| Mock hidden from public live checkout | Confirmed | Pending |
| Monnify/Paystack hidden from public live checkout | Confirmed | Pending |
| Webhook URL configured in Squad dashboard | Confirmed | Pending |
| Callback URL configured in Squad dashboard | Confirmed | Pending |
| Support owner available | Assigned | Pending |

## Test Scope

Approved test amount:

```text
Low value only, approved by finance/management outside Git
```

Provider:

```text
Squad by GTBank
```

Payment mode:

```text
Live, only after explicit approval and environment confirmation
```

## Execution Steps

1. Confirm backend health:

```text
GET /api/v1/health
```

2. Confirm Admin Payment Readiness shows Squad live ready.
3. Confirm Customer checkout shows only Squad by GTBank.
4. Create a low-value customer order.
5. Start Squad checkout from the Customer App.
6. Complete payment using the approved live test method.
7. Return to KariGO through the configured callback/redirect.
8. Tap `Verify payment` in the Customer App.
9. Confirm backend verifies the payment with Squad.
10. Confirm order moves to the paid/vendor workflow only after verification succeeds.
11. Confirm Admin order/payment record matches amount, currency and reference.
12. Confirm Vendor Dashboard sees the paid order.
13. Confirm Squad dashboard record matches KariGO reference and amount.
14. Confirm signed webhook is accepted.
15. Confirm no sensitive payment data appears in logs or UI.
16. Record reconciliation evidence outside Git.

## Evidence Template

| Field | Value |
| --- | --- |
| Test ID |  |
| Date/time |  |
| Operator |  |
| Approval owner |  |
| Environment |  |
| Backend URL |  |
| Backend commit |  |
| Customer app build/update |  |
| Provider | Squad by GTBank |
| Amount band | Low-value approved test |
| Currency | NGN |
| Order reference |  |
| Payment reference masked |  |
| Customer identifier masked |  |
| Squad authorization opened | Passed / Failed / Blocked |
| Callback/redirect returned safely | Passed / Failed / Blocked |
| Customer tapped Verify payment | Passed / Failed / Blocked |
| Backend verification result | Passed / Failed / Blocked |
| Webhook result | Passed / Failed / Blocked |
| Admin payment record | Passed / Failed / Blocked |
| Vendor order visibility | Passed / Failed / Blocked |
| Reconciliation match | Passed / Failed / Blocked |
| Result | Passed / Failed / Blocked |
| Issue summary |  |
| Fix or rollback action |  |
| Reviewer signoff |  |

## Failure Handling

If any live payment step fails:

- stop further live payment testing;
- do not retry with larger amounts;
- preserve safe logs only;
- confirm whether the payment was captured in Squad;
- reconcile the KariGO order/payment record;
- notify the finance/support owner;
- decide Go / Pause before another attempt.

## Current Result

```text
Low-value Squad live payment test: Not executed
Reason: Waiting for Render live variables, explicit approval and operator execution
Production payment launch: Not approved by this record
```
