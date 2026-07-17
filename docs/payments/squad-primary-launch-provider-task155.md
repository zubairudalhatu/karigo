# Task 155 - Squad Primary Launch Payment Provider

Date: 2026-07-17

## Purpose

Record KariGO's updated payment launch strategy after Squad by GTBank approved KariGO while Paystack and Monnify approvals remain pending.

This document does not activate live payments and does not contain payment credentials.

## Updated Launch Priority

| Priority | Provider | Current launch status | Customer checkout posture |
| --- | --- | --- | --- |
| 1 | Squad by GTBank | Primary launch provider | Live checkout only after environment verification and finance/management approval |
| 2 | Monnify | Pending provider approval | Future secondary provider after approval |
| 3 | Paystack | Pending provider approval | Future secondary provider after approval |
| Fallback | Mock payment | Staging/testing fallback only | Hidden/disabled for public live checkout |

Do not remove Monnify, Paystack or Mock provider code. Mock payment must remain available for staging and rollback testing only.

## Backend Safety Gate

Live customer checkout remains blocked unless all of the following are true in the backend environment:

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=squad
SQUAD_MODE=live
SQUAD_SECRET_KEY=
SQUAD_BASE_URL=
SQUAD_CALLBACK_URL=
SQUAD_WEBHOOK_SECRET=
SQUAD_LIVE_ACTIVATION_APPROVED=true
```

Rules:

- Store all values only in Render environment variables or the approved production secret manager.
- Never commit Squad keys, webhook secrets, merchant IDs, dashboard screenshots or `.env` files.
- `SQUAD_BASE_URL` must be a live HTTPS Squad API host confirmed from the approved Squad dashboard or official Squad support.
- `SQUAD_CALLBACK_URL` must be an approved HTTPS return/callback URL.
- Webhook verification must use `SQUAD_WEBHOOK_SECRET`.
- Payment success must require backend verification; the Customer App must never mark an order paid by itself.

## Customer Checkout Visibility

Staging/default builds:

- Mock Payment visible.
- Monnify Sandbox and Paystack Test Mode can remain visible for controlled checks.
- Squad Sandbox is hidden unless `EXPO_PUBLIC_SQUAD_SANDBOX_CHECKOUT_ENABLED=true`.

Future Squad live launch build/update:

```text
EXPO_PUBLIC_PAYMENT_LAUNCH_MODE=squad_live
```

Expected visible provider:

```text
Squad by GTBank
```

Hidden from public live checkout:

- Mock Payment
- Monnify
- Paystack

## Provider Notes

Squad:

- Approved for KariGO.
- Primary launch provider.
- Requires live credential verification, callback URL, webhook URL and webhook secret before public launch.

Monnify:

- Provider approval pending.
- Keep as future secondary provider.
- Do not expose for public live checkout until approved.

Paystack:

- Provider approval pending.
- Keep as future secondary provider.
- Do not expose for public live checkout until approved.

Mock:

- Staging/testing fallback only.
- Must be hidden/disabled for public live checkout.

## Current Decision

```text
Squad launch priority: Primary
Live Squad checkout: Prepared but not activated
Monnify/Paystack: Pending approval
Mock payment: Staging fallback only
Production publishing: Not changed by this task
```
