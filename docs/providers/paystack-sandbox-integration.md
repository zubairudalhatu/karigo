# Paystack Sandbox Integration

## Status

Paystack sandbox initiation, direct verification, and signed webhook parsing are
implemented behind the existing payment provider registry. Mock payment remains the
default and continues to support the complete local demo.

No live payment or live refund call is enabled.

Current Task 32 activation decision: ready for controlled preparation, but waiting for
formal management approval, secure sandbox credentials, deployed staging evidence, and
customer authorization/callback handling. Keep `PAYMENT_PROVIDER=mock` until then.

## Required Environment Variables

```env
PAYMENT_PROVIDER=paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=https://your-sandbox-callback.example/payments/paystack
```

Obtain test credentials from an approved Paystack test-mode dashboard. Use test keys
only, store the actual values in the staging secret manager, and leave committed examples
blank. The backend validates that only a Paystack test-mode secret is accepted while this
sandbox integration is enabled. Never commit keys or put the secret key in a frontend
environment.

`PAYSTACK_WEBHOOK_SECRET` is optional because Paystack commonly signs webhook payloads
with the secret key; when set, KariGO uses it as an explicit webhook-signing override.

## Enable Sandbox Mode

1. Store the test secret outside source control.
2. Set `PAYMENT_PROVIDER=paystack`.
3. Set a public HTTPS callback URL if the frontend callback flow is being tested.
4. Start the backend and confirm startup environment validation passes.
5. Configure Paystack's test webhook URL:
   `POST https://your-api.example/api/v1/payments/webhook/paystack`.

Keep `PAYMENT_PROVIDER=mock` for ordinary local demo and automated smoke testing.

## Payment Flow

1. Customer creates an order; KariGO calculates the final total.
2. Customer initiates payment for the owned awaiting-payment order.
3. KariGO creates a pending Payment record and generates the transaction reference.
4. PaystackProvider sends the amount in kobo, reference, customer email, callback URL,
   and minimal metadata to Paystack.
5. Backend returns Paystack's authorization URL/access code/reference.
6. After checkout/callback, frontend asks KariGO to verify the reference.
7. KariGO queries Paystack directly and compares reference, amount, and currency with the
   stored Payment before applying the existing successful-payment workflow.

## Webhook Flow

- Endpoint: `POST /api/v1/payments/webhook/paystack`
- Nest captures the raw request body.
- PaystackProvider verifies `x-paystack-signature` using HMAC SHA-512.
- Invalid/missing signatures are rejected.
- Verified raw payloads are stored in `PaymentWebhookLog`.
- Only verified `charge.success` events with matching reference/amount/currency can
  confirm payment.
- Existing uniqueness and successful-payment guards make duplicate events idempotent.

Production TODO: publish and verify the final HTTPS webhook URL, add monitoring for
signature failures, and confirm Paystack's current signing guidance before go-live.

## Refund Limitation

Customer refund requests and admin approval remain available, but admin approval updates
KariGO records only. It does not call Paystack's refund API. Sandbox refund submission,
asynchronous reconciliation, and finance approval evidence remain TODOs.

## Frontend Testing Note

Paystack provides test cards and sandbox checkout tools through its official test-mode
documentation/dashboard. Do not write test card details into source control. The customer
app still needs a product decision between external browser and in-app webview checkout.

## Security Checklist

- [x] Server-owned order total
- [x] Secret key remains backend-only
- [x] Test-key-only startup validation
- [x] Direct server-side verification
- [x] Reference, amount, and currency checks
- [x] Raw-body webhook signature verification
- [x] Existing verification/webhook idempotency
- [ ] Sandbox end-to-end test against an approved Paystack test account
- [ ] Provider refund integration/reconciliation
- [ ] Production secret manager, monitoring, and incident rehearsal
- [ ] Live-mode approval and separate production safety controls
