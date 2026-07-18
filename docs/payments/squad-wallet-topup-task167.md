# Task 167 - Squad Wallet Top-Up Readiness

## Purpose

Enable KariGO Wallet top-up through Squad by GTBank while keeping wallet order payment disabled.

## Recommended Environment Values

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=true
WALLET_PAYMENTS_ENABLED=false
```

Optional:

```text
WALLET_MIN_TOP_UP_AMOUNT=100
```

Do not commit `.env` files or payment credentials.

## Public Config

`GET /api/v1/payments/public-config` returns:

- `walletTopUpEnabled`
- `walletPaymentsEnabled`
- `walletPaymentNote`
- `walletTopUpProvider`
- `walletTopUpProviderLabel`
- `walletMinimumTopUpAmount`

When `WALLET_TOP_UP_ENABLED=true`, the expected customer-safe values are:

```text
walletTopUpEnabled=true
walletTopUpProvider=squad
walletTopUpProviderLabel=Squad by GTBank
walletPaymentsEnabled=false
```

## Backend Flow

1. Customer starts top-up from Customer App Wallet.
2. Backend creates a pending `CustomerWalletLedgerEntry`.
3. Backend creates a pending `Payment` with `paymentPurpose=WALLET_TOP_UP`.
4. Backend initializes Squad checkout and returns an external authorization URL.
5. Customer completes Squad checkout outside the app.
6. Customer returns to the app and taps verify, or Squad sends webhook.
7. Backend verifies provider evidence.
8. Wallet is credited only after backend verification/webhook success.

## Idempotency

- Repeated verification after successful payment returns the existing successful payment.
- Webhook logs are unique by gateway, event type and transaction reference.
- Posted wallet ledger entries are not credited again.

## Still Disabled

- Wallet order payment
- Wallet withdrawals
- Automatic refunds
- Referral wallet rewards
- Subscription billing
- Payout automation
