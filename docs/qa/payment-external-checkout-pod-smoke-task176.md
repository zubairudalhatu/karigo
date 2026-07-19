# Task 176 - Payment External Checkout and Pay on Delivery Smoke

Date: 2026-07-19

## Scope

Use this smoke record after deploying Task 176 backend changes and publishing the Customer App update.

Do not record Squad keys, card details, OTPs, webhook secrets, tokens, screenshots, APK/AAB links, or payment artifact URLs in this document.

## Expected Results

### Squad Order Payment

1. Create a Customer order with `Pay with Squad`.
2. The Customer App must open the Squad HTTPS checkout page externally in the browser/custom tab.
3. The app must not show Expo Router `Unknown Page 404` for a `https://pay.squadco.com/...` route.
4. Return to the Customer App and tap `Verify payment status`.
5. The order must only become paid after backend verification or webhook confirmation succeeds.

Admin Orders verification:
- Order starts as awaiting payment while provider verification is pending.
- Payment reference belongs to Squad.
- No secret values or provider payload secrets are shown in Admin surfaces.

### Wallet Top-Up

1. Open Customer App > Profile > KariGO Wallet.
2. Enter a valid top-up amount and tap `Start wallet top-up`.
3. The Customer App must open the Squad HTTPS checkout page externally.
4. The app must not show Expo Router `Unknown Page 404` for a `https://pay.squadco.com/...` wallet route.
5. Return to the wallet screen and use `Open Squad checkout again` if needed.
6. Tap `Verify wallet top-up`.
7. If Squad has not confirmed payment yet, the app should show a clear pending-verification message.
8. Wallet balance must update only after backend verification/webhook confirmation succeeds.

Admin Wallets verification:
- Top-up appears as pending until backend verification succeeds.
- Ledger credit is posted only after provider evidence is verified.
- Client-side wallet credit remains disabled.

### Pay on Delivery

1. At checkout, select `Pay on Delivery`.
2. Tap `Create order`.
3. The app must create the order directly and must not open Squad checkout.
4. The customer should land on the order detail or confirmation screen.
5. Order detail should show `Pay on Delivery` instructions and the amount to pay.

Admin Orders verification:
- `paymentMethod` is `CASH_ON_DELIVERY`.
- Payment state is the approved cash pending state, currently `CASH_PENDING`.
- Cash collection status starts as pending collection.
- Manual reconciliation remains Admin-controlled.

## Guardrails

- Do not use Expo Router navigation for external provider checkout URLs.
- Do not mark payment paid from the Customer App alone.
- Do not require wallet balance for Pay on Delivery.
- Do not initiate Squad for Pay on Delivery orders.
- Do not expose provider secrets in Customer, Admin, logs, docs, screenshots or support tickets.
