# Task 166 - Cash/POD and Wallet Readiness Visibility

## Purpose

Task 166 adds Admin Payment Readiness visibility for launch payment options that are not online card/bank providers:

- Cash / Pay on Delivery
- Wallet Top-Up
- Wallet Payment

This complements the existing provider readiness cards for Squad by GTBank, Mock payment, Monnify and Paystack.

## Admin Payment Readiness

Admin Portal -> Payment Readiness now shows:

- Squad by GTBank as primary launch provider.
- Cash / Pay on Delivery enabled or disabled state.
- Cash/POD launch cities: Kano and Abuja.
- Cash/POD customer-selectable state.
- Cash/POD reconciliation requirement.
- Admin reconciliation availability.
- Captain cash collection confirmation availability.
- Vendor Cash/POD visibility availability.
- Wallet top-up enabled or disabled state.
- Wallet payment enabled or disabled state.
- Wallet top-up provider: Squad by GTBank.
- Backend verification requirement.
- Client-side wallet credit disabled.
- Admin wallet visibility availability.

No secret values are returned or displayed.

## Public Customer Config

`GET /api/v1/payments/public-config` returns customer-safe launch payment fields:

- `cashPaymentEnabled`
- `cashPaymentLabel`
- `cashPaymentNote`
- `walletTopUpEnabled`
- `walletPaymentsEnabled`
- `walletPaymentNote`
- `launchCities`

Customer App checkout uses these fields to decide whether Cash/POD and Wallet are visible.

## Recommended Initial Launch State

Use these Render environment values for immediate launch:

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Wallet should stay disabled until Squad wallet top-up verification is fully completed.

## Guardrails

- Cash/POD is not electronic payment.
- Cash/POD orders remain `CASH_PENDING` until manual reconciliation.
- Wallet balances must not be credited by the client.
- Wallet top-up credit is allowed only after backend provider verification or webhook processing.
- No payout automation is enabled by this visibility work.
