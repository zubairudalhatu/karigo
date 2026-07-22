# KariGO Utilities Provider Activation Checklist

This checklist prepares KariGO Utilities for controlled provider-backed processing while keeping live customer fulfilment behind explicit approval gates.

## Scope

Supported utility categories:

- Airtime
- Data
- Electricity
- Cable TV

Current safety position:

- Utilities can run in provider-backed controlled test/sandbox mode.
- Live utility fulfilment is allowed only through the Task 191 wallet-funded lifecycle when all wallet and provider flags are enabled.
- Wallet-to-utility payment must use backend wallet balance checks, ledger debit and automatic reversal controls.
- Raw provider payloads, API keys, tokens and webhook secrets must never be committed or shown in customer/admin UI.

## Required Environment Variables

Use Render environment variables or an approved secret manager only. Do not place real values in source control.

Canonical KariGO utility flags:

```text
UTILITIES_PROVIDER=accelerate
UTILITIES_ENABLED=true
UTILITIES_TEST_MODE=true
UTILITIES_CUSTOMER_PURCHASE_ENABLED=true
UTILITIES_CUSTOMER_PURCHASES_ENABLED=true
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
```

Provider aliases supported by the backend:

```text
UTILITIES_PROVIDER_ENABLED
UTILITIES_PROVIDER_NAME
UTILITIES_PROVIDER_BASE_URL
UTILITIES_PROVIDER_API_KEY
UTILITIES_PROVIDER_SECRET
UTILITIES_PROVIDER_WEBHOOK_SECRET
UTILITIES_PROVIDER_ENV
```

Accelerate-specific names supported by the backend:

```text
ACCELERATE_ENABLED
ACCELERATE_UTILITIES_ENABLED
ACCELERATE_BASE_URL
ACCELERATE_API_BASE_URL
ACCELERATE_API_KEY
ACCELERATE_API_SECRET
ACCELERATE_CLIENT_ID
ACCELERATE_CLIENT_SECRET
ACCELERATE_WEBHOOK_SECRET
ACCELERATE_ENV
```

Optional provider path overrides:

```text
ACCELERATE_VALIDATE_RECIPIENT_PATH
ACCELERATE_QUOTE_PATH
ACCELERATE_PURCHASE_PATH
ACCELERATE_STATUS_PATH
```

## Backend Gate Conditions

Customer utility purchase processing is allowed only when all of these are true:

```text
UTILITIES_PROVIDER=accelerate
UTILITIES_ENABLED=true
UTILITIES_CUSTOMER_PURCHASE_ENABLED=true
ACCELERATE_ENABLED=true
ACCELERATE_BASE_URL uses HTTPS
ACCELERATE_API_KEY is configured
UTILITIES_TEST_MODE=true
```

For live wallet-funded fulfilment, these additional gates are required:

```text
UTILITIES_TEST_MODE=false
UTILITIES_WALLET_PAYMENT_ENABLED=true
UTILITIES_LIVE_FULFILLMENT_ENABLED=true
```

The backend rejects `UTILITIES_TEST_MODE=false` unless wallet payment and live fulfilment flags are both enabled.

## Activation Steps

1. Confirm provider contract details for Airtime, Data, Electricity and Cable TV.
2. Confirm provider base URL, request paths and status endpoint shape.
3. Configure env vars in Render with secrets stored only in Render.
4. Keep `UTILITIES_TEST_MODE=true` for controlled provider testing, or set the Task 191 wallet/live flags for approved wallet-funded live fulfilment.
5. Redeploy backend.
6. Open Admin Payment Readiness and confirm Utilities show provider-backed test mode.
7. Open Customer App Utilities and confirm categories still load.
8. Submit one low-value controlled test transaction per enabled category.
9. Confirm Admin Utilities shows transaction reference, provider mode, provider reference and safe status.
10. Use Admin Utilities provider status verification to reconcile non-terminal transactions.

## Sandbox/Controlled Test Checks

- Airtime: Nigerian phone number validates and provider processing starts.
- Data: Nigerian phone number validates and provider processing starts.
- Electricity: meter number validates and provider processing starts.
- Cable TV: smartcard/IUC number validates and provider processing starts.
- Failed provider responses mark the transaction `FAILED` without showing raw payload.
- Processing provider responses remain `PROCESSING` until verification confirms final status.
- Customers can view only their own utility transactions.
- Admin can view safe transaction details but not provider secrets.

## Go-Live Blockers

Do not disable test mode unless these are completed and approved:

- Payment-backed utility funding is approved.
- Wallet-to-utility debit and automatic reversal rules are implemented and tested.
- Provider webhook contract and signature verification are confirmed.
- Reconciliation and support processes are approved.
- Low-value live provider tests pass across all intended categories.
- Operations signs off on failure handling and customer communication.

## Rollback

If provider processing fails or provider configuration is uncertain:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
UTILITIES_ENABLED=false
ACCELERATE_ENABLED=false
```

Then redeploy backend and verify Customer App Utilities returns to readiness/test-mode messaging.
