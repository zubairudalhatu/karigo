# Task 179 - Flutterwave Environment Runbook

Date: 2026-07-19

## Purpose

This runbook explains how operations should configure Flutterwave customer checkout on Render without exposing secrets in source control.

## Render Setup

Go to:

```text
Render Dashboard -> KariGO backend service -> Environment -> Add/Update Variables -> Save -> Redeploy
```

Set values from the approved secret source only. Do not paste values into Git, tickets, screenshots, chat, docs or source files.

## Required Flags

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=flutterwave
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
FLUTTERWAVE_ENVIRONMENT=live
FLUTTERWAVE_CLIENT_ID=<Render secret only>
FLUTTERWAVE_CLIENT_SECRET=<Render secret only>
FLUTTERWAVE_PUBLIC_KEY=<Render secret only if needed>
FLUTTERWAVE_BASE_URL=https://f4bexperience.flutterwave.com/
FLUTTERWAVE_TOKEN_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLUTTERWAVE_REDIRECT_URL=<public HTTPS redirect/callback URL>
FLUTTERWAVE_SECRET_HASH=<Render secret only>
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

If the deployment uses `FLUTTERWAVE_CALLBACK_URL` or `FLUTTERWAVE_WEBHOOK_SECRET` aliases, keep them aligned with the approved redirect URL and webhook secret hash. Prefer one source of truth in Render where possible.

`FLUTTERWAVE_SECRET_KEY` is a legacy/v3 credential name and is not used for v4 live checkout authentication.

## Callback and Webhook Checklist

1. Configure the Flutterwave dashboard redirect URL to the public HTTPS KariGO callback URL.
2. Configure the Flutterwave webhook URL to:

```text
https://karigo-8htn.onrender.com/api/v1/payments/webhook/flutterwave
```

3. Store the webhook secret/hash only in Render.
4. Redeploy the backend.
5. Confirm Admin Payment Readiness shows Flutterwave ready.
6. Run one approved low-value live checkout test.
7. Confirm backend verification/webhook marks only the matching order payment successful.

## Rollback

If Flutterwave checkout has an operational issue:

```text
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=false
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Redeploy the backend and publish a Customer EAS Update if the visible checkout copy needs to refresh immediately.

## Safety Notes

- Customer checkout must never expose provider secret values.
- Customer App must open Flutterwave checkout externally.
- Backend verification/webhook must confirm payment before orders are marked paid.
- Wallet top-up remains disabled until a separate wallet-specific verification task.
- Squad remains disabled/internal review until a separate reopening task.
