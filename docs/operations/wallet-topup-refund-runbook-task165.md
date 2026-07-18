# Wallet Top-Up and Refund Runbook - Task 165

KariGO Wallet supports a safe ledger model. Task 165 activates controlled top-up and wallet order payment foundations, not withdrawals or automatic refunds.

## Wallet Top-Up

1. Customer initiates top-up from the Customer App wallet screen.
2. Backend creates a pending wallet ledger entry.
3. Customer completes Squad checkout.
4. Backend verifies payment through provider verification or webhook.
5. Backend posts the ledger entry and updates wallet balance.

If verification fails, the wallet must remain unchanged.

## Wallet Order Payment

Wallet order payment is server-side and atomic:

- backend checks the wallet is active;
- backend checks sufficient balance;
- backend debits balance and posts an `ORDER_PAYMENT` ledger entry;
- backend creates the order as paid only after the debit succeeds.

## Refund Readiness

Refunds remain manually reviewed. When a wallet credit is approved:

1. Open Admin Portal -> Wallets.
2. Select the customer wallet.
3. Record a controlled credit adjustment.
4. Use a clear reason and optional idempotency key.
5. Confirm no provider refund or payout automation was triggered.

Do not store provider secrets, card data, bank credentials or OTPs in wallet notes.
