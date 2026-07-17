# Task 158 - Customer Live Payment Config

Date: 2026-07-17

## Purpose

Document how the Customer App receives public-safe payment configuration for live Squad checkout.

This document does not activate live payments and does not contain payment credentials.

## Public-Safe Backend Endpoint

The Customer App now uses:

```text
GET /api/v1/payments/public-config
```

The endpoint does not require Admin authentication because it returns only customer-safe values.

Expected response fields:

```text
livePaymentsEnabled
activeProvider
customerSelectableProviders
launchProviderLabel
mockPaymentVisible
squadReady
monnifyVisible
paystackVisible
```

The endpoint must never return:

- Squad secret key
- Squad webhook secret
- Paystack or Monnify secrets
- Render environment values
- Admin readiness details
- Full provider diagnostic tables

## Live Squad Mode

When Render has approved Squad live configuration and the backend gate is ready, public config should indicate:

```text
livePaymentsEnabled=true
activeProvider=squad
customerSelectableProviders=["squad"]
launchProviderLabel=Squad by GTBank
mockPaymentVisible=false
squadReady=true
monnifyVisible=false
paystackVisible=false
```

Customer checkout behavior:

- show `Payment provider`;
- show only `Squad by GTBank`;
- show `Pay with Squad - NGN {amount}`;
- send `paymentProvider: "squad"` to backend;
- require backend payment verification before marking an order paid.

## Staging Mode

When live payments are disabled, public config can keep staging providers visible:

```text
livePaymentsEnabled=false
customerSelectableProviders=["mock","monnify","paystack"]
```

Staging behavior:

- Mock Payment remains available.
- Monnify Sandbox and Paystack Test Mode can remain visible for controlled testing.
- Squad Sandbox remains hidden unless explicitly enabled for sandbox verification.
- Live payment, wallet funding, automatic refunds and payout automation remain disabled.

## Failure Behavior

If the Customer App cannot load `payments/public-config`:

- do not show staging payment options as if they are valid for live checkout;
- show a retry message;
- disable payment start until config is loaded;
- do not mark any order paid.

For live Squad initialization failure, customer copy should be:

```text
Squad payment could not be started. Please try again or contact KariGO support.
```

Do not mention sandbox, mock payment or staging fallback in live customer failure copy.

## Current Status

```text
Customer runtime payment config: Implemented
Live Squad visibility: Controlled by backend public config
Mock staging fallback: Preserved for non-live mode
Production publishing: Not changed by this task
```
