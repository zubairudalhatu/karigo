# Utility Request Cancellation - Task 206D

Task 206D adds safe customer cancellation for eligible Bills & Utilities requests.

## Customer Scope

Customers can cancel a utility request only from the owned receipt screen and only while the request is still eligible.

Eligible statuses:

- `DRAFT`
- `PENDING`

Ineligible statuses:

- `PROCESSING`
- `SUCCESSFUL`
- `FAILED`
- `CANCELLED`

`PROCESSING` is treated as provider-side fulfilment in progress and cannot be cancelled from the app.

## Backend Safety

- The existing endpoint is reused: `POST /api/v1/customer/utilities/transactions/:transactionId/cancel`.
- The backend validates customer ownership before cancellation.
- Already-cancelled requests are idempotent and return the current cancelled receipt.
- Terminal requests cannot be cancelled.
- Wallet reversal is idempotent through the existing utility wallet reversal idempotency key.
- Duplicate cancellation must not create duplicate wallet credits.
- Cancellation metadata records `cancelledBy`, `cancellationStatus` and `cancelledAt` for support review without exposing provider payloads or secrets.

## Customer Receipt Copy

Receipt copy should follow these rules:

- `SUCCESSFUL`: "Your utility request was successful."
- `FAILED`: "This utility request failed. If your wallet was debited, KariGO will reverse it automatically."
- cancelled without reversal: "This utility request was cancelled before fulfilment. If your wallet was debited, KariGO will confirm the reversal status."
- cancelled with reversal: "This utility request was cancelled and your wallet has been reversed."
- `PENDING` or `PROCESSING`: "Your request is being processed. KariGO will confirm once the provider completes fulfilment."

Do not promise cash reimbursement. Utility reversals are wallet-ledger based unless a separate support process is approved.

## Support Checks

When a customer asks about a cancelled utility request:

1. Open Admin Utilities and search by reference.
2. Confirm the status is `CANCELLED`.
3. Check wallet debit and reversal references.
4. If wallet was debited and no reversal reference exists, escalate to Operations for wallet ledger review.
5. If provider status is already processing or successful, explain that cancellation is no longer available and verify fulfilment/refund policy.

## Post-Deployment QA

1. Create a pending review/test utility request.
2. Open the full receipt.
3. Confirm "Cancel utility request" is visible.
4. Cancel and confirm the receipt refreshes to `CANCELLED`.
5. Repeat cancellation and confirm no duplicate wallet credit is created.
6. Confirm successful and failed receipts do not show the cancellation action.
7. Confirm a different customer cannot cancel the transaction.

## Rollback

If cancellation creates an unexpected issue:

1. Revert the Customer App update if UI behavior is wrong.
2. Revert the backend deployment if eligibility or wallet reversal behavior is wrong.
3. Use Admin Utilities and Wallets to verify affected references.
4. Do not manually credit wallet balances without an owner-approved reconciliation record.
