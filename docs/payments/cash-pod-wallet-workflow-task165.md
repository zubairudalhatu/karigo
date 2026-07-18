# Cash/POD and Wallet Workflow - Task 165

Task 165 adds persisted launch controls for KariGO payment methods while keeping live payment safety guardrails intact.

## Supported Customer Payment Methods

- `SQUAD`: online checkout through Squad by GTBank.
- `WALLET`: server-side KariGO Wallet order payment.
- `CASH_ON_DELIVERY`: Pay on Delivery / Cash.

Cash/POD and wallet order payment are launch-scoped to Kano and Abuja.

## Order Payment States

- Squad orders start as `paymentMethod=SQUAD`, `paymentStatus=PENDING`, `orderStatus=AWAITING_PAYMENT`.
- Wallet-paid orders are created only after an atomic server-side wallet debit succeeds. They are stored as `paymentMethod=WALLET`, `paymentStatus=SUCCESSFUL`, `orderStatus=PAID`.
- Cash/POD orders are stored as `paymentMethod=CASH_ON_DELIVERY`, `paymentStatus=CASH_PENDING`, `orderStatus=PAID`, `cashCollectionStatus=PENDING_COLLECTION`.

Cash/POD orders must never be treated as electronically paid. Reconciliation is manual and admin-reviewed.

## Wallet Top-Up

Wallet top-up uses Squad authorization:

1. Customer initiates top-up.
2. Backend creates a pending wallet ledger entry.
3. Backend creates a `Payment` with `paymentPurpose=WALLET_TOP_UP`.
4. Customer completes Squad checkout externally.
5. Backend verification or webhook posts the wallet ledger entry and credits the wallet.

The Customer App must never credit wallet balance client-side.

## Refund Handling

Refunds remain manual and reviewed. Wallet refund credits can be recorded through controlled Admin wallet adjustments when approved. Automatic provider refunds and bank/card refunds are not activated by this task.

## Disabled Automation

This task does not activate payout automation, wallet withdrawals, automatic refunds, Monnify/Paystack live mode, bulk messaging, or marketing sends.
