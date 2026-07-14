# Task 121 Multi-Provider Sandbox Payment Configuration

## Current Pilot Default

The Kano pilot default remains:

```dotenv
PAYMENT_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Do not switch staging away from mock unless a short controlled sandbox test window has
been approved.

## Secret Storage

Store all provider credentials only in Render or the approved staging secret manager.
Never commit:

- Paystack keys or webhook secrets;
- Monnify API keys, secret keys, contract codes if treated as sensitive, or webhook
  secrets;
- Squad secret keys or webhook secrets;
- test card details;
- provider dashboard screenshots;
- `.env` files.

## Paystack Test Mode Variables

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

## Monnify Sandbox Variables

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

## Squad Sandbox Variables

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

## Render Steps

1. Confirm mock payment is the current default.
2. Add only the selected provider's sandbox variables to Render.
3. Keep all non-selected provider credentials absent or unused.
4. Confirm `PAYMENTS_LIVE_ENABLED=false`.
5. Redeploy backend.
6. Run the selected provider's sandbox test script.
7. Roll back to mock immediately after the controlled test window unless management
   approves continued sandbox testing.

## Health Checks

After redeploy:

- `GET /api/v1/health` returns OK.
- Customer order quote/create works.
- Payment initiation returns a provider-safe authorization response.
- Payment verification remains server-side.
- Failed/invalid provider verification does not mark the order paid.
- Provider secrets are not present in API responses, logs or frontend bundles.

## Rollback

```dotenv
PAYMENT_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Redeploy backend and run one mock checkout before continuing pilot operations.
