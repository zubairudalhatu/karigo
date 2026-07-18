# Cash Reconciliation Runbook - Task 165

Cash/POD is a manual launch payment option for Kano and Abuja.

## Operator Flow

1. Confirm the order is `paymentMethod=CASH_ON_DELIVERY`.
2. Confirm the Customer App amount and Admin total match.
3. Confirm the Captain recorded cash collection at delivery where applicable.
4. Receive cash through the approved KariGO Operations process.
5. Open Admin Portal -> Orders -> order detail.
6. Enter a reconciliation note.
7. Select `Mark cash reconciled`.

## Rules

- Do not mark Cash/POD as electronically paid.
- Do not reconcile without a note.
- Do not trigger vendor payout automation from cash reconciliation.
- Do not include customer OTPs, payment secrets, provider keys or private notes in reconciliation notes.

## Audit

Admin reconciliation records:

- order ID and order number;
- expected/collected amount;
- reconciliation note;
- admin user ID;
- reconciliation timestamp.

Use the Admin audit log to review reconciliation changes.
