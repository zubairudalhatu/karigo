# KariGO Wallet Ledger Foundation - Task 86

## Current Status

KariGO Wallet now has a backend ledger foundation for customer balances and future wallet activity.

This task adds database models and protected backend APIs only. It does not activate live wallet top-up, withdrawals, automatic refunds, referral rewards, subscriptions, live gateway funding, wallet checkout, Taxi payments, Pharmacy payments or provider payouts.

## Data Model

The wallet foundation uses:

- `CustomerWallet`: one wallet per customer profile.
- `CustomerWalletLedgerEntry`: immutable-style ledger entries for credits, debits and future traceability.

Supported ledger entry types are prepared for:

- `TOP_UP`
- `REFUND`
- `ADMIN_ADJUSTMENT`
- `ORDER_PAYMENT`
- `SERVICE_PAYMENT`
- `REVERSAL`
- `REFERRAL_REWARD`

Only controlled admin adjustments are currently exposed as a write path.

## Customer APIs

Protected customer routes:

- `GET /api/v1/wallet`
- `GET /api/v1/wallet/transactions`

Rules:

- Customer must be authenticated with role `CUSTOMER`.
- Customer can only see their own wallet.
- Wallet is created lazily when a customer first requests it.
- Customer ledger response does not expose internal admin metadata.

## Admin APIs

Protected admin routes:

- `GET /api/v1/admin/wallets`
- `GET /api/v1/admin/wallets/:walletId`
- `POST /api/v1/admin/wallets/:walletId/adjustments`

Allowed admin roles:

- `SUPER_ADMIN`
- `OPERATIONS_ADMIN`
- `FINANCE_OFFICER`

Admin adjustment rules:

- Only active wallets can be adjusted.
- Debit adjustments cannot overdraw the available balance.
- Adjustment requests support an optional idempotency key.
- Admin adjustments are audit logged.
- No provider, payment gateway or withdrawal integration is called.

## Security Notes

- No secrets are stored in wallet records.
- No payment provider credentials are involved.
- No automatic refund or reward issuance is enabled.
- No withdrawal endpoint exists.
- No customer can access another customer's wallet.
- Admin write access is role restricted and audit logged.

## Future TODOs

- Customer Wallet UI.
- Admin Wallet visibility UI.
- Refund-to-wallet workflow after management approval.
- Wallet payment for orders/services after product approval.
- Partial wallet plus card/payment provider flow.
- Wallet top-up sandbox integration after provider approval.
- Reversal workflow and ledger reconciliation report.
