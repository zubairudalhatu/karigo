# Payment Sandbox Test Script

Run only in an approved staging environment with provider test mode. Never record test
instrument details, secrets, or private customer data.

## A. Successful Payment

1. Customer creates an order; record masked order/reference evidence.
2. Initiate payment and confirm sandbox authorization URL/access code is returned.
3. Customer App opens the backend-returned HTTPS authorization URL externally.
4. Complete provider-approved sandbox checkout.
5. Return to KariGO and use the customer-visible backend verification action.
6. Confirm payment `SUCCESSFUL`, order `PAID` (or parcel dispatch-ready), one history transition, customer notification, and vendor visibility.

## B. Failed Or Cancelled Payment

1. Create/order initiate payment, then fail/cancel/abandon sandbox checkout.
2. Return to KariGO and attempt backend verification.
3. Confirm payment remains `FAILED` or `PENDING` as designed and order never becomes `PAID`.
4. Confirm clear customer state/error and safe retry behavior.

## C. Duplicate Verification

Verify the same successful reference twice. Confirm no duplicate payment transition,
order history, promo usage, customer/vendor notification, settlement, or earning record.

## D. Webhook Verification

1. Send a provider-generated valid test event; confirm signature and safe processing.
2. Repeat the event; confirm duplicate/idempotent response and no duplicate effects.
3. Send an approved invalid-signature test; confirm rejection and no state change.

## E. Amount Validation

Attempt an altered frontend amount and provider evidence mismatch. Confirm KariGO rejects
both, preserves the server-calculated order total, and does not mark the order paid.

## F. Refund Workflow

1. Use an approved mock/sandbox successful payment.
2. Customer requests refund; authorised admin reviews/approves.
3. Confirm payment/order refund statuses, history, audit, and notification.
4. Record limitation: KariGO currently updates internal records only; Paystack sandbox
   refund submission/reconciliation is pending and must not be represented as complete.

Attach one evidence template per scenario and obtain reviewer approval.
