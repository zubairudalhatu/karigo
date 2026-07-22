# Utilities Wallet Payment Activation

Task 191 enables wallet-funded Bills & Utilities payments for the supported live categories:

- Airtime
- Data
- Electricity
- Cable TV

Utilities payment is wallet-only. KariGO does not collect direct card, bank transfer or Flutterwave payment for Utilities in this flow.

## Required Environment Variables

Set values only in Render or the approved secret manager. Do not commit values.

```text
UTILITIES_PROVIDER=accelerate
UTILITIES_ENABLED=true
UTILITIES_PROVIDER_ENABLED=true
UTILITIES_TEST_MODE=false
UTILITIES_CUSTOMER_PURCHASE_ENABLED=true
UTILITIES_CUSTOMER_PURCHASES_ENABLED=true
UTILITIES_WALLET_PAYMENT_ENABLED=true
UTILITIES_LIVE_FULFILLMENT_ENABLED=true
ACCELERATE_ENABLED=true
ACCELERATE_UTILITIES_ENABLED=true
ACCELERATE_BASE_URL=<set in Render only>
ACCELERATE_API_BASE_URL=<set in Render only if used>
ACCELERATE_API_KEY=<set in Render only>
ACCELERATE_API_SECRET=<set in Render only if required>
ACCELERATE_CLIENT_ID=<set in Render only if required>
ACCELERATE_CLIENT_SECRET=<set in Render only if required>
ACCELERATE_WEBHOOK_SECRET=<set in Render only if webhook is approved>
ACCELERATE_ENV=live
```

## Activation Checklist

- Confirm Customer Wallet top-up is working and backend verification credits balances.
- Confirm Admin Wallets can show top-up and ledger records.
- Confirm Accelerate account and provider keys are configured in Render only.
- Confirm Admin Payment Readiness shows Utilities provider ready.
- Confirm Customer App public config shows `utilitiesPaymentMethod=WALLET`.
- Confirm Customer App shows `Pay with Wallet` on Utilities only when all backend flags are enabled.
- Confirm Customer App does not show direct Flutterwave/card/bank utility payment.

## Wallet Debit And Reversal Lifecycle

1. Customer enters utility details and requests a backend quote.
2. Customer submits the transaction with the quote reference as an idempotency key.
3. Backend validates customer ownership, provider, product, amount, recipient and flags.
4. Backend checks wallet balance server-side.
5. Backend creates the Utility transaction and wallet debit ledger entry in one database transaction.
6. Backend calls the configured Accelerate provider.
7. Provider success keeps the wallet debit final and marks the utility transaction successful.
8. Provider pending keeps the utility transaction pending/processing and does not reverse immediately.
9. Provider failure marks the utility transaction failed and creates a reversal ledger entry.

The Customer App must never mark a utility payment successful by itself.

## Idempotency Controls

- Repeated submit with the same quote/idempotency key returns the existing utility transaction.
- Repeated provider verification does not create duplicate reversal ledger entries.
- Wallet ledger entries store source references linking back to the utility transaction.
- Raw provider payloads and provider secrets are not returned to customers or Admin.

## Rollback

To return Utilities to readiness-only mode:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
```

Then redeploy the backend and verify Customer App Utilities returns to review/readiness copy.
