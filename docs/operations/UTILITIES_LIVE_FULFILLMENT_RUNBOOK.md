# Utilities Live Fulfillment Runbook

This runbook covers wallet-funded Utilities fulfilment through the approved provider integration.

## Operating Rules

- Supported categories are Airtime, Data, Electricity and Cable TV.
- Payment method is KariGO Wallet only.
- Customer wallet balance must be checked by the backend.
- Provider fulfilment must be called by the backend.
- Customer App must not debit, credit, reverse or mark fulfilment complete by itself.
- No provider keys, tokens, raw payloads or webhook secrets should be copied into tickets, docs or screenshots.

## Normal Success Flow

1. Customer tops up wallet through the approved wallet top-up flow.
2. Customer opens Utilities and sees available wallet balance.
3. Customer reviews utility amount, fee and total.
4. Customer taps `Pay with Wallet`.
5. Backend creates the utility transaction and wallet debit.
6. Backend submits the provider request.
7. Provider returns success or successful status verification.
8. Admin Utilities shows provider reference, provider status and wallet debit reference.
9. Customer receipt shows reference, provider, amount, fee, total, wallet debit reference, status and safe token/code when returned.

## Pending Provider Flow

- If provider returns pending or processing, the wallet debit remains posted.
- Customer sees processing copy.
- Admin can use `Verify provider status` to re-check through the backend.
- Do not manually mark successful in production.

## Failed Provider Flow

1. Provider reports failure during purchase or later status verification.
2. Backend creates a wallet reversal ledger entry if a debit was posted.
3. Utility transaction becomes failed.
4. Customer sees: `Utility payment failed. Your wallet has been reversed.`
5. Admin Utilities shows wallet debit status and wallet reversal reference.

## Customer Support Escalation

Collect only safe details:

- Customer name or phone on account.
- Utility transaction reference.
- Wallet debit reference.
- Wallet reversal reference, if present.
- Provider reference, if visible in Admin.
- Status and timestamp.

Never request provider credentials, OTPs, card details, webhook secrets or raw provider payloads.

## Admin Monitoring

Check:

- Admin Payment Readiness: Utilities flags, provider status and missing key names.
- Admin Utilities: transaction status, provider status, provider reference, wallet debit reference and reversal status.
- Admin Wallets: wallet ledger entries for service payment debit and reversal.

## Rollback Plan

1. Set `UTILITIES_CUSTOMER_PURCHASE_ENABLED=false`.
2. Set `UTILITIES_CUSTOMER_PURCHASES_ENABLED=false`.
3. Set `UTILITIES_WALLET_PAYMENT_ENABLED=false`.
4. Set `UTILITIES_LIVE_FULFILLMENT_ENABLED=false`.
5. Redeploy backend.
6. Run backend health check and Customer Utilities smoke test.
7. Confirm the Customer App no longer shows `Pay with Wallet`.

Webhook activation remains future work unless separately approved and signature verification is implemented.
