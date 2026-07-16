# Task 137 Customer Test Payment Provider Selection

## Purpose

KariGO Customer App checkout now lets authenticated staging testers choose a sandbox payment provider per payment attempt:

- Mock payment
- Paystack Test Mode
- Monnify Sandbox/Test Mode
- Squad Sandbox/Test Mode

This does not activate live payments. The first Kano pilot default remains mock payment unless operations explicitly chooses a sandbox provider during a test checkout.

## Safety Position

Live payment collection, wallet auto-credit, automatic refunds, vendor payout automation, Captain payout automation and wallet withdrawals remain disabled.

No payment provider secrets are stored in the Customer App. Paystack, Monnify and Squad credentials must stay in the backend staging secret manager only.

## Customer App Behavior

- Mock payment is selected by default.
- The tester may choose Paystack Test Mode, Monnify Sandbox or Squad Sandbox before starting payment.
- The app sends the selected provider as `paymentProvider` to the backend.
- Hosted checkout opens only when the backend returns an HTTPS authorization URL.
- The app never marks an order paid by itself.
- The customer must return to KariGO and tap `Verify payment status`.
- Backend verification remains mandatory before the order can move into paid/vendor/dispatch processing.

## Backend Behavior

The backend accepts only these customer-selectable providers:

```text
mock
paystack
monnify
squad
```

If no `paymentProvider` is sent, backend behavior continues to use the environment-selected active provider. Customer-selected sandbox providers still use the existing server-side provider adapters and fail closed when required sandbox credentials or test-mode flags are missing.

## Provider Guardrails

- Paystack must remain Test Mode only.
- Monnify must remain Sandbox/Test Mode only.
- Squad must remain Sandbox/Test Mode only.
- `PAYMENTS_LIVE_ENABLED` must remain `false` for sandbox testing.
- Provider secret keys, webhook secrets, test cards and provider screenshots must not be committed.

## QA Steps

1. Confirm staging backend default remains mock payment.
2. Create a customer order from the Customer App.
3. On Checkout, confirm `Mock payment` is selected by default.
4. Select one sandbox provider.
5. Tap `Continue with <provider>`.
6. Confirm backend either returns a safe hosted HTTPS checkout URL or fails closed with a safe provider configuration error.
7. If hosted checkout opens, complete or cancel the sandbox flow using provider-approved test inputs outside the repository.
8. Return to KariGO and tap `Verify payment status`.
9. Confirm the app does not mark the order paid unless backend verification succeeds.
10. Repeat one provider at a time.

## Expected Redeploys

- Backend redeploy is required for the new `paymentProvider` request handling.
- Customer App EAS update is sufficient for the selector UI because no native dependency was added.
- A fresh APK is not required solely for this task.
