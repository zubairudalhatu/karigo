# Task 166 - Cash/POD Enable Runbook

## Purpose

Enable Cash / Pay on Delivery for the Kano and Abuja launch while keeping wallet top-up and wallet payment disabled until verification is complete.

## Render Environment Values

Set these on the backend service only:

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Do not place environment values in source-controlled `.env` files.

## Deployment Steps

1. Open Render Dashboard.
2. Select the KariGO backend service.
3. Go to Environment.
4. Add or update the three flags above.
5. Save changes.
6. Redeploy the backend.
7. Confirm `/api/v1/payments/public-config` returns `cashPaymentEnabled: true`.
8. Confirm Admin Payment Readiness shows Cash / Pay on Delivery enabled.
9. Publish Customer App and Captain App updates if the deployed mobile build does not already include Task 165/166 code.

## Operations Flow

1. Customer selects Pay on Delivery at checkout.
2. Backend creates order with Cash/POD payment method and cash pending status.
3. Vendor sees the order and prepares it as normal.
4. Admin assigns a Delivery Captain.
5. Delivery Captain collects the amount shown in the app.
6. Delivery Captain confirms cash collection before completing OTP handoff.
7. Admin reconciles the cash manually with a required note.

## Guardrails

- Do not mark Cash/POD as electronically paid.
- Do not auto-reconcile cash.
- Do not auto-pay vendors or Captains from cash.
- Do not use Cash/POD outside approved launch cities.
- Investigate any amount mismatch before reconciliation.
