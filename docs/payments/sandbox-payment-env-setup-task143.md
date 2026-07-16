# Task 143 - Sandbox Payment Environment Setup

## Purpose

This guide explains how KariGO operators should configure sandbox payment
environment variables on Render and verify provider readiness without exposing
keys or activating live payments.

## Current Position

```text
Backend: https://karigo-8htn.onrender.com
Payment default: Mock payment
Live payments: Disabled
Provider priority: Monnify, then Paystack, then Squad later
```

Do not configure live keys in this task. Do not commit `.env` files, provider
keys, test cards, webhook secrets, screenshots with secrets, or dashboard tokens.

## Render Setup Path

Use the Render dashboard only:

```text
Render Dashboard -> KariGO backend service -> Environment -> Add/Update Variables -> Save -> Redeploy
```

After every payment environment change, redeploy the backend and verify readiness
through the Admin Portal Payment Readiness page.

## Admin Readiness Page

Admin Portal route:

```text
/payment-readiness
```

Backend endpoint used by the page:

```text
GET /api/v1/admin/payments/provider-readiness
```

The page shows:

- active environment provider;
- sandbox provider readiness;
- configured/missing status only;
- safe missing variable names;
- webhook routes;
- live activation block status.

The page must never display secret values.

## Monnify Sandbox - Launch Priority 1

Required or expected variables:

```text
PAYMENTS_PROVIDER=monnify
PAYMENT_PROVIDER=monnify
PAYMENTS_LIVE_ENABLED=false
MONNIFY_MODE=sandbox
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_CALLBACK_URL=
MONNIFY_WEBHOOK_SECRET=
```

Optional if the backend default is acceptable:

```text
MONNIFY_BASE_URL=https://sandbox.monnify.com
```

## Paystack Test Mode - Launch Priority 2

Required or expected variables:

```text
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_CALLBACK_URL=
PAYSTACK_WEBHOOK_SECRET=
```

Optional if the backend default is acceptable:

```text
PAYSTACK_BASE_URL=https://api.paystack.co
```

## Squad Sandbox - Later Priority

Squad may remain disabled for launch if Monnify and/or Paystack are ready.

Required or expected variables:

```text
PAYMENTS_PROVIDER=squad
PAYMENT_PROVIDER=squad
PAYMENTS_LIVE_ENABLED=false
SQUAD_MODE=sandbox
SQUAD_SECRET_KEY=
SQUAD_PUBLIC_KEY=
SQUAD_CALLBACK_URL=
SQUAD_WEBHOOK_SECRET=
```

Optional if the backend default is acceptable:

```text
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
```

## Mock Rollback

Return staging/pilot checkout to mock payment:

```text
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Redeploy backend and confirm mock payment still works.

## Safety Notes

- Secret keys stay server-side only.
- Public keys are client-safe in provider terms, but KariGO should still avoid
  committing them unless a frontend flow explicitly requires them.
- Customer App checkout should show only safe provider-failure messages.
- Server-side verification is required before an order is marked paid.
- Wallet top-up, refunds, withdrawals and payout automation remain disabled.

## Current Decision

```text
Sandbox configuration: Ready for operator setup in Render.
Live activation: Not approved.
```
