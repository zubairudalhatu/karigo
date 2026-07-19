# Task 178 - Pay on Delivery Only Fallback

Date: 2026-07-19

## Purpose

KariGO Customer checkout is temporarily running Pay on Delivery only while Squad checkout and wallet top-up external URL handling remain under live review.

Do not record or paste Squad keys, wallet provider secrets, webhook secrets, card details, OTPs, screenshots, APK/AAB files, keystores, `.env` files or build artifact URLs in this document.

## Required Render Environment State

Set these on the backend service:

```text
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Squad, Monnify and Paystack readiness diagnostics may remain configured for Admin visibility, but customer-facing electronic checkout must stay disabled until separately approved.

## Customer POD Smoke Test

1. Pull and deploy the backend commit for Task 178.
2. Publish the Customer App EAS Update for the production/internal-testing channel.
3. Open the Customer App and add a supported vendor item to cart.
4. Select or create a supported Kano or Abuja delivery address.
5. Open Checkout.
6. Confirm only `Pay on Delivery` is visible as the customer payment method.
7. Confirm `Pay with Squad`, wallet payment and wallet checkout options are not visible.
8. Tap `Create Pay on Delivery order`.
9. Confirm no external URL opens.
10. Confirm the order detail opens.
11. In Admin Orders, confirm:
    - `paymentMethod` is `CASH_ON_DELIVERY`.
    - `paymentStatus` is `CASH_PENDING`.
    - Cash collection remains pending manual reconciliation.

## Wallet Smoke Test

1. Open Customer App > Profile > KariGO Wallet.
2. Confirm balance and ledger remain visible.
3. Confirm the top-up card says `Wallet top-up is temporarily unavailable.`
4. Confirm no top-up checkout button is visible while the fallback flags are off.
5. Confirm wallet balance is not credited from the app.

## Admin Readiness Smoke Test

1. Open Admin Portal > Payment Readiness.
2. Confirm Cash / Pay on Delivery shows enabled when `CASH_ON_DELIVERY_ENABLED=true`.
3. Confirm Squad customer checkout shows `Disabled / Internal review`.
4. Confirm wallet top-up and wallet order payment show disabled with the fallback flags.
5. Confirm provider diagnostics remain visible without exposing secret values.

## Re-Enabling Squad Later

Only re-enable Squad customer checkout after a separate approved fix verifies external browser handling end to end.

Minimum future checks before re-enabling:

1. Squad checkout URLs open outside Expo Router on all supported Android builds.
2. Wallet top-up URLs open outside Expo Router.
3. Cancelled payment returns safely to KariGO without marking paid.
4. Successful payment is confirmed only by backend verification or webhook.
5. Admin Payment Readiness shows live Squad readiness with callback and webhook configured.

Future Render state for re-enabling customer Squad checkout must be approved separately. Do not turn on `SQUAD_CUSTOMER_CHECKOUT_ENABLED` or `WALLET_TOP_UP_ENABLED` from this fallback runbook.

## Safety Note

Squad and wallet remain disabled for customer checkout until external payment opening is verified. Pay on Delivery keeps launch orders operational while payment-provider checkout is reviewed.
