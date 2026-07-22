# Utilities Wallet Payment QA Checklist

Use this checklist before wider public rollout of wallet-funded Utilities.

## Preconditions

- Backend deployed with Task 191.
- Customer EAS Update published after Task 191.
- Admin Portal redeployed after Task 191.
- Customer wallet has sufficient verified balance.
- Utilities provider env variables are configured in Render only.
- `UTILITIES_TEST_MODE=false` only when wallet payment and live fulfilment gates are both approved.

## Customer App Tests

- Open Utilities hub and confirm Airtime, Data, Electricity and Cable TV are visible.
- Open Airtime and confirm backend readiness copy is shown.
- Confirm available wallet balance is shown.
- Enter a valid phone number and amount.
- Tap `Review Utility Request`.
- Confirm amount, fee, total and quote reference are displayed.
- Confirm `Pay with Wallet` is shown only when backend config enables wallet-funded Utilities.
- With insufficient balance, confirm the button is disabled and the app shows: `Insufficient wallet balance. Please top up your wallet and try again.`
- With sufficient balance, submit once and confirm no duplicate transaction is created on repeated taps with the same quote/reference.
- Confirm successful receipt shows utility reference, provider, total, wallet debit reference and status.
- Confirm pending receipt shows processing copy and wallet debit reference.
- Confirm failed receipt shows wallet reversal copy and wallet reversal reference.
- For electricity, confirm any provider token/code is shown only if returned safely by the backend.
- Confirm no raw provider payload is visible.

## Admin Portal Tests

- Open Payment Readiness and confirm Bills & Utilities provider readiness loads.
- Confirm wallet utility payment, live provider fulfilment and payment method are visible.
- Confirm missing config shows key names only, never values.
- Open Admin Utilities and confirm list loads.
- Open a transaction detail.
- Confirm payment method, provider reference, provider status, wallet debit reference and reversal status are visible where applicable.
- Use `Verify provider status` on a non-terminal transaction.
- Confirm repeated verification does not duplicate a wallet reversal.
- Confirm production does not allow manual successful override.

## Backend Tests

- Provider disabled blocks wallet-funded live purchase.
- Missing provider config blocks purchase safely.
- Customer purchase disabled keeps the app in readiness-only mode.
- Wallet payment disabled blocks live fulfilment.
- Insufficient wallet balance blocks purchase before provider call.
- Successful provider response posts one wallet debit and finalises the utility transaction.
- Provider failure creates one wallet reversal and marks the transaction failed.
- Provider pending keeps the transaction pending/processing.
- Repeated submit with the same idempotency key does not double debit.
- Non-owner cannot view another customer's utility transaction.
- Admin can view safe utility transaction fields only.

## Rollback Verification

After setting the rollback flags to false and redeploying backend:

- Customer App no longer shows `Pay with Wallet`.
- Public config reports wallet utility payment disabled.
- Admin Payment Readiness reports wallet utility payment disabled.
- Existing transaction history remains visible.
- No wallet balances are changed by rollback.
