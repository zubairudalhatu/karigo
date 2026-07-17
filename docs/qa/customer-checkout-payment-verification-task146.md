# Task 146 - Customer Checkout Payment Verification

Date: 2026-07-16

## Scope

Verify Customer App checkout provider selection after deferring Squad Sandbox from the launch candidate.

This is sandbox/test verification only. Live payments remain disabled.

## Expected Checkout Providers

Customer App checkout should show:

- Mock Payment
- Monnify Sandbox
- Paystack Test Mode

Customer App checkout should not show:

- Squad Sandbox

## Admin Diagnostics

Admin Payment Readiness should still show:

- Mock payment
- Monnify Sandbox
- Paystack Test Mode
- Squad Sandbox

Task 155 supersedes the original launch priority. Squad by GTBank should now be labelled as the primary launch provider, while live checkout remains gated until environment verification and approval.

## Verification Steps

1. Open Customer App with the latest staging build/update.
2. Create or open an unpaid order.
3. Open checkout/payment selection.
4. Confirm only Mock Payment, Monnify Sandbox and Paystack Test Mode are selectable.
5. Confirm Squad Sandbox is not shown.
6. Select Mock Payment and complete staging checkout.
7. Create another unpaid order or retry payment.
8. Select Monnify Sandbox and confirm hosted checkout opens.
9. Return to KariGO and verify that the order is not marked paid until backend verification succeeds.
10. Repeat with Paystack Test Mode.
11. Open Admin Portal Payment Readiness.
12. Confirm Squad is marked as primary launch provider and still gated until environment verification.

## Expected Results

- Mock payment remains successful for staging fallback.
- Monnify Sandbox checkout opens successfully.
- Paystack Test Mode checkout opens successfully.
- Squad Sandbox is hidden from customer checkout.
- Squad diagnostics remain visible in Admin.
- No live payment provider is activated.
- No wallet funding, automatic refunds, settlements or payouts are triggered.

## Evidence Template

| Field | Value |
| --- | --- |
| Test ID |  |
| Date/time |  |
| Tester |  |
| Customer App build/update |  |
| Backend commit/deployment |  |
| Admin Portal commit/deployment |  |
| Mock visible | Yes / No |
| Monnify visible | Yes / No |
| Paystack visible | Yes / No |
| Squad hidden from customer checkout | Yes / No |
| Monnify checkout opens | Passed / Failed / Blocked |
| Paystack checkout opens | Passed / Failed / Blocked |
| Backend verification required | Yes / No |
| Admin Squad diagnostics visible | Yes / No |
| Live payments disabled | Yes / No |
| Notes |  |

## Closeout Decision

Launch-candidate payment provider order:

1. Squad by GTBank primary, pending live environment verification
2. Monnify pending approval / future secondary
3. Paystack pending approval / future secondary
3. Mock fallback
4. Mock payment staging fallback only
