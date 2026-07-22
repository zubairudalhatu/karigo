# KariGO Utilities Operations Runbook

This runbook describes how KariGO Operations should monitor Utilities in controlled provider test mode and in the Task 191 wallet-funded live fulfilment mode.

## Operating Position

Utilities support Airtime, Data, Electricity and Cable TV. Provider-backed processing is available only when explicitly enabled by backend flags. Live fulfilment must use KariGO Wallet only, with backend balance checks, wallet ledger debit and automatic reversal if provider fulfilment fails.

Customers should see safe messages only:

- If provider-backed mode is off: `Utilities are being activated. Please try again later or use test mode where available.`
- If provider-backed mode is on: `Your request is being processed. KariGO will confirm once the provider completes fulfillment.`
- If wallet-funded live mode is on: `Utilities are paid with KariGO Wallet. Your balance is debited by the backend before provider fulfilment and reversed automatically if fulfilment fails.`

## Transaction Lifecycle

Utility transactions may be:

```text
PENDING
PROCESSING
SUCCESSFUL
FAILED
CANCELLED
```

Expected flow:

1. Customer submits request.
2. Backend creates a `PENDING` transaction.
3. Backend validates recipient server-side.
4. Backend calls the configured provider.
5. Backend stores provider reference and safe metadata summary only.
6. Backend updates status to `PROCESSING`, `SUCCESSFUL` or `FAILED`.
7. Admin can verify provider status for non-terminal transactions.

## Admin Monitoring

Use Admin Portal -> Utilities to review:

- Customer
- Category
- Provider
- Amount
- KariGO transaction reference
- Provider reference
- Payment method
- Wallet debit reference
- Wallet reversal reference, if any
- Status
- Created/updated dates
- Safe provider note

For a non-terminal transaction, use `Verify provider status` to ask the backend to check provider status again. Admin does not paste provider payloads into the dashboard.

Admin API endpoint:

```text
POST /api/v1/admin/utilities/transactions/:transactionId/verify
```

The endpoint is admin-only, idempotent and stores only safe provider metadata.

## Webhook Position

Provider webhook processing is not enabled in this task because the provider webhook contract and signature scheme must be confirmed before accepting live callbacks.

Until webhook verification is implemented:

- Keep non-terminal records in `PENDING` or `PROCESSING`.
- Use Admin provider status verification for reconciliation.
- Do not manually mark provider success in production.
- Do not retry failed provider submissions without checking payment/funding rules.

## Failure Handling

If provider submission fails:

- Status should become `FAILED`.
- Customer note should remain safe and concise.
- Raw provider payload must not be exposed.
- Admin should review provider dashboard/reference, if available.
- If a wallet debit was posted, backend reversal should create a reversal ledger entry.
- Do not charge/deduct customer wallet from the app.

If a transaction remains `PROCESSING`:

- Run provider status verification.
- Check provider dashboard by reference.
- Record support notes outside customer-facing text.
- Escalate if the provider cannot confirm final status.

## Wallet Debit And Reversal Position

When Task 191 wallet-funded live mode is enabled, every utility payment must include:

- Server-side wallet balance check.
- Wallet debit ledger entry linked to the utility transaction.
- Provider fulfilment after approved backend debit.
- Automatic reversal if provider fulfilment fails.
- Idempotent webhook/status handling to prevent double debit or double success.

## Support Guidance

For customers:

- Confirm transaction reference.
- Confirm category and recipient.
- Share only safe status wording.
- Do not share provider raw payloads.
- Do not promise fulfilment until provider confirms success.

For Operations:

- Use Admin Utilities as the source of truth.
- Use provider dashboard only for reconciliation.
- Do not expose API keys, webhook secrets or provider account details.

## Go-Live Checklist

Before live utility fulfilment:

- Provider contract and supported categories confirmed.
- Provider paths and response shapes confirmed.
- Webhook signature verification implemented and tested, or polling/reconciliation job approved.
- Payment-backed flow approved.
- Wallet debit/reversal approved if wallet is used.
- Low-value live tests pass for Airtime, Data, Electricity and Cable TV.
- Admin monitoring and support escalation are rehearsed.
- Rollback flags are documented and accessible to the release operator.

## Rollback

Set these backend env flags and redeploy:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
UTILITIES_ENABLED=false
ACCELERATE_ENABLED=false
```

Then verify:

- Backend health passes.
- Admin Payment Readiness shows Utilities disabled/readiness-only.
- Customer App Utilities shows activation/readiness messaging.
