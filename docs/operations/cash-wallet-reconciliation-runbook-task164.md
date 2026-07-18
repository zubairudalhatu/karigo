# Task 164 - Cash/POD and Wallet Reconciliation Runbook

## Current Status

Cash/POD and wallet top-up/payment are prepared with launch-readiness copy and configuration flags. They are not fully operational money-movement workflows yet.

## Cash/POD Guardrails

Until a dedicated cash workflow is implemented:

- do not mark Cash/POD orders electronically paid;
- do not create fake online payment records;
- do not include unreconciled cash in automatic settlements;
- customer must be told to pay only the amount shown in the app;
- Operations must record who collected cash, amount collected, time collected, and final reconciliation status outside automated settlement logic.

## Minimum Safe Cash Workflow Needed

Before enabling live Cash/POD checkout:

1. Add a persisted payment method or offline collection record.
2. Keep order payment status as pending/cash-pending until reconciliation.
3. Show Cash/POD method to Admin, Vendor Dashboard and Captain App.
4. Record Captain/vendor collection responsibility.
5. Add Admin reconciliation controls.
6. Exclude unreconciled cash from paid settlement reports.
7. Log audit events for each reconciliation action.

## Wallet Guardrails

Wallet top-up and wallet payment must remain backend-authoritative:

- top-up is pending until Squad verification/webhook/manual review succeeds;
- wallet credit is server-side only;
- wallet order debit is atomic and must fail if balance is insufficient;
- order is not marked paid unless the wallet debit succeeds;
- refunds are reviewed by Admin before any wallet ledger credit;
- no Customer App screen may credit or debit the wallet directly.

## Reconciliation Evidence

Store only masked references in Git-tracked docs:

- order number;
- masked customer phone/email if needed;
- amount;
- payment method;
- collection owner;
- reconciliation status;
- reviewer;
- date/time.

Never store card data, provider secrets, webhook secrets, OTPs, full payment URLs, or raw provider dashboard screenshots in Git.
