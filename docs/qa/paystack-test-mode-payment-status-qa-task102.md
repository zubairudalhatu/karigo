# Paystack Test Mode Payment Status QA - Task 102

Date prepared: 2026-07-13

## Purpose

Verify the polished Customer App payment experience for controlled staging checkout.
This QA pack covers customer-facing payment states, manual Paystack Test Mode
verification, retry behaviour, wallet/refund guardrails and evidence capture.

Task 102 does not activate live Paystack, live wallet funding, withdrawals, automatic
refunds, live payouts, live rides, Pharmacy marketplace or production payments.

## Integration Guardrail

Paystack Test Mode, Accelerate utility services, and Termii SMS are integration-ready
concepts only. Live payment collection, live utility fulfilment, wallet refund automation,
SMS sending and payout automation remain disabled until separately approved.

Provider separation:

- Paystack: customer checkout/payment collection in Test Mode only.
- Accelerate.ng: future utility payment services for airtime, data, electricity, cable TV
  and other supported bills/utilities.
- Termii: future SMS and notification services for OTP, order updates, Delivery Captain
  notifications, utility alerts, wallet/refund alerts and referral notifications.

## Customer Payment States To Verify

| State | Expected Customer App behaviour |
| --- | --- |
| Awaiting payment | Shows clear `Awaiting payment` copy and explains that payment must complete before vendor/dispatch processing. |
| Paystack Test Mode authorization | Opens only the backend-returned HTTPS authorization URL externally, then shows return-and-verify guidance. |
| Return from Paystack | Customer returns to KariGO and taps `Verify payment status`; the app does not mark the order paid locally. |
| Payment success | Backend verification changes payment to successful and the order proceeds to vendor/dispatch processing. |
| Payment failed/cancelled | Order remains unpaid, customer sees a clear retry-oriented error, and no paid status is shown. |
| Retry payment | Customer can reopen the pending authorization page or start payment again when safe. |
| Wallet/refund future note | Customer sees that wallet refunds, wallet funding and payout automation are not active. |

## Required Staging Configuration

Use staging secret manager only. Do not commit values.

```dotenv
PAYSTACK_MODE=test
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=
PAYSTACK_CALLBACK_URL=
```

Mock rollback:

```dotenv
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Note: the provider selector must match the backend-supported staging value. The current
repository documentation uses `paystack` for the Paystack Test Mode provider selector.
If KariGO later standardizes on `paystack_test`, add and test that backend alias before
using it in Render.

## QA Script

### T102-CUS-001 - Mock Payment Regression

1. Configure backend staging for mock payments.
2. Customer creates an order from the Customer App.
3. Tap `Continue to payment`.
4. Confirm mock payment completes without opening Paystack.
5. Open order detail and confirm payment success is visible.

Expected result:

- Mock provider remains the fallback.
- No Paystack page opens.
- No live provider is contacted.

### T102-CUS-002 - Paystack Test Mode Authorization

1. Configure backend staging with approved Paystack Test Mode values only.
2. Customer creates an order.
3. Tap `Continue to payment`.
4. Confirm a backend-returned HTTPS Paystack authorization page opens externally.
5. Confirm the Customer App shows Paystack Test Mode guidance after returning.
6. Complete the provider-approved test checkout outside the repository.
7. Return to KariGO.
8. Tap `Verify payment status`.

Expected result:

- Customer App says KariGO marks orders paid only after backend verification.
- Customer App never displays Paystack secret keys, test cards or raw provider payloads.
- Order is paid only after backend verification succeeds.

### T102-CUS-003 - Return Without Completing Payment

1. Start Paystack Test Mode authorization.
2. Cancel or abandon the external payment page.
3. Return to KariGO.
4. Tap `Verify payment status`.

Expected result:

- The app shows a safe verification-failed/retry message.
- Order remains unpaid.
- Customer can reopen payment or retry.

### T102-CUS-004 - Failed Verification Retry

1. Simulate provider verification failure or missing provider configuration.
2. Tap `Verify payment status`.
3. Read the displayed error message.
4. Reopen the payment page where available.

Expected result:

- Error copy is specific to payment verification.
- No generic checkout crash or false paid state appears.
- Retry action remains available where a pending authorization exists.

### T102-CUS-005 - Wallet And Refund Messaging

1. Open Checkout after order creation.
2. Open Order detail for a pending or paid order.
3. Review the wallet/refund card.

Expected result:

- App states that wallet refunds and wallet-to-utility payments are future workflows.
- App does not imply automatic wallet refund, wallet funding, withdrawal or payout.

### T102-CUS-006 - Order Detail Retry Payment

1. Open an existing unpaid order from Order detail.
2. Tap `Continue to payment`.
3. Complete or abandon Paystack Test Mode checkout.
4. Return and tap `Verify payment status`.

Expected result:

- Order detail uses the same safe payment-state copy as Checkout.
- Successful verification refreshes the order.
- Failed verification does not move the order to paid.

## Admin And Vendor Visibility Checks

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Admin sees payment status | Admin Portal displays the updated payment/order state after backend verification. | Pending |  |
| Vendor sees paid order | Vendor Dashboard receives paid order after verification only. | Pending |  |
| No secret exposure | Admin/Vendor UI does not expose Paystack keys, webhook secrets, test cards or raw sensitive payloads. | Pending |  |
| Refund remains controlled | Refunds remain admin-reviewed and do not trigger automatic wallet credit or provider refund. | Pending |  |

## Evidence Template

| Field | Value |
| --- | --- |
| Test ID |  |
| Date/time |  |
| Tester |  |
| Environment | Staging |
| Provider mode | Mock / Paystack Test Mode |
| Order reference |  |
| Payment reference | Masked safe reference only |
| Customer App build/update |  |
| Expected result |  |
| Actual result |  |
| Status | Passed / Failed / Blocked |
| Screenshot/log reference | Masked reference only |
| Issue ID |  |
| Reviewer |  |

Never record Paystack secret keys, webhook secrets, test card details, OTPs, bearer tokens,
private customer data, full phone numbers, Accelerate.ng credentials or Termii credentials.

## Go / No-Go

Go for controlled Paystack Test Mode QA only if:

- Staging uses Test Mode keys from the secret manager only.
- `PAYMENTS_LIVE_ENABLED=false`.
- Customer App opens backend-returned HTTPS authorization only.
- Backend verification is required before marking the order paid.
- Mock fallback still works.
- Wallet funding, automatic refunds and payout automation remain disabled.
- No P0/P1 payment-state clarity or security issue remains.

No-go if:

- Any live key or live payment path is used.
- Any secret/test instrument appears in Git, screenshots or logs.
- Customer App marks an order paid without backend verification.
- Cancelled/failed checkout can become paid.
- Retry guidance is missing or confusing.
