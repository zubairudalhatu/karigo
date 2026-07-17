# Task 156 - Squad Webhook and Callback Setup

Date: 2026-07-17

## Purpose

Document the safe Squad webhook and callback setup needed before a low-value live payment test.

Do not include Squad secrets, dashboard screenshots, payment instrument details, customer private data or `.env` files in this record.

## Backend Routes

Confirmed backend webhook route:

```text
POST /api/v1/payments/webhook/squad
```

Current backend webhook URL format:

```text
https://<backend-domain>/api/v1/payments/webhook/squad
```

Current Render backend example:

```text
https://karigo-8htn.onrender.com/api/v1/payments/webhook/squad
```

Use the approved production backend domain when a production domain is assigned.

## Webhook Signing

Squad live mode requires:

```text
SQUAD_WEBHOOK_SECRET=
```

The value must be stored only in Render or the approved secret manager.

Expected behavior:

- Valid signed Squad payment webhook is accepted.
- Invalid signature is rejected.
- Duplicate webhook does not duplicate order/payment state changes.
- Webhook payload is stored or logged only with safe operational metadata.
- Secret values are never returned through API responses.

## Callback / Redirect Setup

Squad initialization uses:

```text
SQUAD_CALLBACK_URL=
```

The callback URL must be HTTPS and configured in Render. Its purpose is to return the user from Squad checkout to a safe KariGO-controlled surface.

Important behavior:

- The callback/redirect alone must not mark an order paid.
- The Customer App must still call backend payment verification after the user returns.
- Backend verification must confirm payment with Squad before order status changes.
- If the callback points to a web landing page, the page should instruct the customer to return to KariGO and tap `Verify payment`.
- If a mobile deep link is approved later, it should open the order payment status screen and still require backend verification.

Do not use an unconfirmed callback route for production launch. If a backend callback handler is required later, add it as a separate implementation task and keep it read-only until verification succeeds.

## Dashboard Configuration Checklist

Confirm in the approved Squad dashboard or with Squad support:

- Live account approved for KariGO.
- Live API access enabled.
- Live base URL confirmed.
- Callback/redirect URL configured.
- Webhook URL configured.
- Webhook signing secret configured.
- Amount unit confirmed.
- NGN currency support confirmed.
- Transaction reference format accepted.
- Webhook retry policy understood.
- Dispute/refund contact path documented outside Git.

## Webhook Test Procedure

1. Configure `SQUAD_WEBHOOK_SECRET` in Render.
2. Configure the Squad dashboard webhook URL.
3. Redeploy backend.
4. Complete an approved low-value Squad live checkout.
5. Confirm backend receives a signed webhook.
6. Confirm invalid signature attempts are rejected if a provider dashboard test tool supports this safely.
7. Confirm duplicate webhook events are traceable and do not duplicate state transitions.
8. Record only masked/safe evidence outside Git.

## Current Status

```text
Webhook route: Implemented
Webhook secret: Must be configured in Render
Callback URL: Must be configured in Render and Squad dashboard
Live webhook verification: Pending operator test
Live callback verification: Pending operator test
```
