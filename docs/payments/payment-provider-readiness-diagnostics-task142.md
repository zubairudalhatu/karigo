# Task 142 - Payment Provider Readiness Diagnostics

## Purpose

This document records the configuration needed to start KariGO sandbox checkout
for Paystack, Monnify and Squad, and the safe diagnostic path for finding missing
configuration.

It does not activate live Paystack, live Monnify, live Squad, live wallet
top-up, automatic refunds, withdrawals, payouts, Accelerate.ng utilities or any
other live financial service.

## Current Position

```text
Default pilot payment: Mock payment
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
Live payments: disabled
Paystack/Monnify/Squad: sandbox foundations only
```

Sandbox providers may fail to start when the staging secret manager is missing
required provider values, points to a live host, or has live mode enabled. The
Customer App must continue to show only a safe fallback message. Exact readiness
details are available only through the admin readiness endpoint and backend logs.

## Admin Readiness Endpoint

```text
GET /api/v1/admin/payments/provider-readiness
```

Access rules:

- Admin authentication required.
- No provider secret values are returned.
- Values are reported only as configured/not configured.
- Missing items are reported using safe names such as `missing PAYSTACK_SECRET_KEY`.

## Paystack Sandbox Configuration

Store these values only in the staging secret manager.

```text
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=
PAYSTACK_WEBHOOK_SECRET=
```

Notes:

- `PAYSTACK_SECRET_KEY` must be a Paystack test secret key.
- `PAYSTACK_PUBLIC_KEY` is client-safe but is not used by the current backend
  hosted-checkout flow.
- `PAYSTACK_CALLBACK_URL` should point to the approved KariGO payment return URL
  for the environment.
- Webhook route:

```text
POST /api/v1/payments/webhook/paystack
```

## Monnify Sandbox Configuration

Store these values only in the staging secret manager.

```text
PAYMENTS_PROVIDER=monnify
PAYMENT_PROVIDER=monnify
PAYMENTS_LIVE_ENABLED=false
MONNIFY_MODE=sandbox
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_CALLBACK_URL=
MONNIFY_WEBHOOK_SECRET=
```

Notes:

- `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY` and `MONNIFY_CONTRACT_CODE` are required
  for hosted checkout initialization.
- `MONNIFY_BASE_URL` must remain a sandbox/test host while live payments are
  disabled.
- Webhook route:

```text
POST /api/v1/payments/webhook/monnify
```

## Squad Sandbox Configuration

Store these values only in the staging secret manager.

```text
PAYMENTS_PROVIDER=squad
PAYMENT_PROVIDER=squad
PAYMENTS_LIVE_ENABLED=false
SQUAD_MODE=sandbox
SQUAD_SECRET_KEY=
SQUAD_PUBLIC_KEY=
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_CALLBACK_URL=
SQUAD_WEBHOOK_SECRET=
```

Notes:

- `SQUAD_SECRET_KEY` must be a Squad sandbox secret key.
- `SQUAD_PUBLIC_KEY` is client-safe but is not used by the current backend
  hosted-checkout flow.
- Webhook route:

```text
POST /api/v1/payments/webhook/squad
```

## Live Readiness

Live activation remains blocked by design:

- Current Paystack, Monnify and Squad adapters are test/sandbox guarded.
- `PAYMENTS_LIVE_ENABLED=true` is not accepted for sandbox checkout.
- Production credentials must not be configured until a separate live-mode
  engineering task and finance/management approval are complete.

## Safe Failure Expectations

If configuration is missing or unsafe:

- backend logs may include safe reasons such as `missing MONNIFY_CONTRACT_CODE`;
- the admin readiness endpoint reports missing configuration without values;
- Customer App checkout shows a generic safe fallback message;
- mock payment remains the rollback path.

## Decision

```text
Sandbox payment readiness: Waiting for provider-specific staging secrets and
admin endpoint verification.
Live payment activation: Not approved.
```
