# Task 179 - Flutterwave and Pay on Delivery Smoke Test

Date: 2026-07-19

## Scope

Use this checklist after backend, Admin Portal and Customer App updates are deployed. Do not record keys, card data, OTPs, screenshots, artifact URLs or credentials in this file.

## A. Flutterwave Online Order Test

1. Confirm backend health: `GET /api/v1/health`.
2. Confirm Admin Payment Readiness shows Flutterwave as primary and ready.
3. Open Customer App checkout for a supported Kano or Abuja order.
4. Confirm payment methods show `Pay with Flutterwave` and `Pay on Delivery`.
5. Confirm `Pay with Squad`, Monnify, Paystack, Mock Payment and wallet payment are not visible in live checkout.
6. Select `Pay with Flutterwave`.
7. Tap `Create order and pay with Flutterwave`.
8. Confirm the app opens Flutterwave checkout externally in browser/custom tab, not an Expo Router page.
9. Complete or cancel the low-value live payment according to the approved operations test script.
10. Return to KariGO and tap verify/retry from the order detail if needed.
11. Confirm order is marked paid only after backend verification/webhook confirms success.

Expected result: no customer-facing Squad route opens, no internal `Unknown Page 404` is shown, and the order remains pending until backend verification succeeds.

## B. Pay on Delivery Order Test

1. Add an item to cart from a supported vendor.
2. Select a Kano or Abuja delivery address.
3. Select `Pay on Delivery`.
4. Tap `Create Pay on Delivery order`.
5. Confirm no provider checkout opens.
6. Confirm order detail opens.
7. Confirm order payment method/status:
   - `paymentMethod=CASH_ON_DELIVERY`
   - `paymentStatus=CASH_PENDING`
   - cash collection pending manual reconciliation

Expected result: Pay on Delivery works even if Flutterwave is disabled or temporarily unavailable.

## C. Confirm Squad Is Hidden

1. Open Customer checkout.
2. Confirm there is no visible `Pay with Squad` action.
3. Open an awaiting-payment order detail.
4. Confirm there is no visible Squad retry action.
5. Confirm Admin Payment Readiness still shows Squad diagnostics as disabled/internal review.

## D. Confirm Wallet Top-Up Disabled

1. Open Customer App > Profile > KariGO Wallet.
2. Confirm balance and ledger remain visible.
3. Confirm the screen says: `Wallet top-up is temporarily unavailable while KariGO verifies the new payment provider.`
4. Confirm no customer wallet top-up button is available.
5. Confirm wallet order payment is not selectable in checkout.

## E. Admin Order and Payment Status Verification

1. Open Admin Portal > Orders.
2. For Flutterwave order:
   - payment method displays `Flutterwave`
   - pending payments remain pending until verified
   - successful verification moves the order to the approved paid status
3. For POD order:
   - payment method displays Cash/POD or Pay on Delivery
   - cash collection remains pending until operations reconcile it
4. Open Admin Portal > Payment Readiness.
5. Confirm:
   - Flutterwave: primary launch provider
   - Pay on Delivery: enabled when the env flag is true
   - Squad: disabled/internal review
   - Wallet top-up/payment: disabled
   - no secret values are displayed

## Result Record

```text
Tester:
Date/time:
Backend commit:
Customer build/update:
Admin deploy:
Flutterwave low-value test result:
Pay on Delivery test result:
Squad hidden confirmation:
Wallet top-up disabled confirmation:
Issues found:
Go/Pause decision:
```
