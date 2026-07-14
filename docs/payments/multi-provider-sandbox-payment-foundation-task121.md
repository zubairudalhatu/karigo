# Task 121 Multi-Provider Sandbox Payment Foundation

## Purpose

Prepare KariGO to test customer checkout through multiple sandbox payment providers
without activating live payment collection.

Supported sandbox/test-mode providers:

- Paystack Test Mode
- Monnify Sandbox/Test Mode
- Squad Sandbox/Test Mode

The first Kano pilot remains on mock payment unless management explicitly approves a
temporary sandbox-provider test window.

## Guardrails

- Do not activate live Paystack, Monnify or Squad.
- Do not commit API keys, webhook secrets, test card details or provider dashboard
  screenshots.
- Do not put payment secret keys in frontend apps.
- Do not activate Accelerate.ng utilities, wallet withdrawals, automatic refunds,
  live rides, ride dispatch, payouts, Pharmacy marketplace, provider login,
  marketing SMS, promotional email, newsletter email or bulk SMS/email.
- Wallet refund, provider-side refund, payout and settlement automation remain disabled.

## Provider Selection

Default pilot mode:

```dotenv
PAYMENT_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Only one payment provider should be selected at a time in staging. After every provider
change, redeploy or restart the backend.

## Paystack Test Mode

Required server-side staging variables:

```dotenv
PAYMENT_PROVIDER=paystack
PAYMENTS_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=
```

Notes:

- `PAYSTACK_SECRET_KEY` must be a test secret key.
- `PAYSTACK_PUBLIC_KEY` may be used only where a client-side public key is explicitly
  required later; this task does not add payment keys to frontend apps.
- Server verification remains mandatory.

## Monnify Sandbox/Test Mode

Required server-side staging variables:

```dotenv
PAYMENT_PROVIDER=monnify
PAYMENTS_PROVIDER=monnify
PAYMENTS_LIVE_ENABLED=false
MONNIFY_MODE=test
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_WEBHOOK_SECRET=
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_CALLBACK_URL=
```

Notes:

- Monnify authentication uses server-side API key and secret only.
- The checkout flow uses the Monnify hosted checkout URL returned by the backend.
- Monnify webhook signatures must be verified before the backend processes a successful
  webhook. If sandbox webhooks are unsigned, use server-side verification instead of
  treating the webhook as paid.

## Squad Sandbox/Test Mode

Required server-side staging variables:

```dotenv
PAYMENT_PROVIDER=squad
PAYMENTS_PROVIDER=squad
PAYMENTS_LIVE_ENABLED=false
SQUAD_MODE=test
SQUAD_SECRET_KEY=
SQUAD_WEBHOOK_SECRET=
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_CALLBACK_URL=
```

Notes:

- `SQUAD_SECRET_KEY` must be a sandbox secret key.
- Squad checkout uses the hosted checkout URL returned by the backend.
- Squad webhook signatures must be verified through the `x-squad-encrypted-body`
  header before a successful webhook can update payment state.

## Backend Behaviour

For all sandbox providers:

- the backend generates the payment reference;
- the backend calculates and verifies the amount;
- the backend stores the selected gateway on the payment record;
- the provider secret key is never returned by the API;
- the customer app receives only safe authorization data such as hosted checkout URL or
  provider access code;
- payment success is accepted only after server-side verification or a verified webhook;
- duplicate verification/webhook processing remains idempotent through existing payment
  processing safeguards;
- failed verification does not move an order to paid.

## Webhook Routes

Use the existing payment webhook route:

```text
POST /api/v1/payments/webhook/paystack
POST /api/v1/payments/webhook/monnify
POST /api/v1/payments/webhook/squad
```

Expected signature headers:

| Provider | Header |
| --- | --- |
| Paystack | `x-paystack-signature` |
| Monnify | `monnify-signature` |
| Squad | `x-squad-encrypted-body` |

## Rollback

Return staging to mock payment:

```dotenv
PAYMENT_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Then redeploy/restart backend and verify:

- customer order creation still works;
- mock payment initiation still works;
- mock verification still marks the order paid;
- vendor/admin dashboards still show the paid order;
- no live provider request is attempted.

## Remaining Non-Goals

- No live payment collection.
- No automatic wallet funding.
- No automatic refunds.
- No bank transfer payout automation.
- No provider-side settlement automation.
- No frontend payment secrets.
