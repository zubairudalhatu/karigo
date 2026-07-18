# Task 173 Squad, Cash/POD and Wallet Live Payment Fixes

Date: 18 July 2026

## Scope

Task 173 keeps Squad by GTBank as the live launch online payment provider, Cash / Pay on Delivery as a controlled launch option, and wallet top-up as backend-verified only.

No payment secrets, webhook secrets, card details or provider dashboard links belong in this document.

## Squad Checkout Fix

- Customer order payment and wallet top-up now read provider checkout links from `authorizationUrl`, `checkoutUrl`, `paymentUrl` or `url`.
- Hosted Squad checkout links must be HTTPS.
- Hosted checkout opens through the device browser/custom tab via Expo WebBrowser, not Expo Router navigation.
- The app only shows the checkout-opened message after the external browser action succeeds.
- Backend verification/webhook confirmation remains required before an order is marked paid or a wallet balance is credited.

Customer-facing error states to verify:

- Missing checkout link: provider did not return a checkout link.
- Invalid checkout link: provider returned an invalid checkout link.
- Browser open failure: checkout could not be opened.
- Provider/backend failure: safe provider-specific startup message.
- Pending verification: `Payment is still pending verification`.

## Wallet Top-Up

- `WALLET_TOP_UP_ENABLED=true` controls customer top-up visibility.
- Wallet top-up creates a pending payment and pending wallet ledger entry before opening Squad checkout.
- Wallet balance updates only after backend verification/webhook success.
- Pending verification must not be treated as wallet credit.
- Admin Wallets should show pending, successful and failed top-up ledger/payment records.

## Cash / Pay on Delivery

- `CASH_ON_DELIVERY_ENABLED=true` controls Cash/POD visibility.
- Cash/POD orders are allowed only for Kano and Abuja launch addresses.
- Cash/POD creates an order without online payment and stores payment status as `CASH_PENDING`.
- Vendor Dashboard shows Cash/POD status.
- Captain App requires cash collection confirmation before delivery completion.
- Admin Portal reconciliation is required before Cash/POD is treated as reconciled.

## Required Environment Flags

Names only:

- `PAYMENTS_LIVE_ENABLED`
- `PAYMENTS_PROVIDER`
- `SQUAD_MODE`
- `SQUAD_SECRET_KEY`
- `SQUAD_BASE_URL`
- `SQUAD_CALLBACK_URL`
- `SQUAD_WEBHOOK_SECRET`
- `SQUAD_LIVE_ACTIVATION_APPROVED`
- `CASH_ON_DELIVERY_ENABLED`
- `WALLET_TOP_UP_ENABLED`
- `WALLET_PAYMENTS_ENABLED`

## Guardrails

- Do not mark Squad payments paid from the app.
- Do not credit wallets from the app.
- Do not mark Cash/POD paid until Admin reconciliation.
- Do not expose provider secrets in frontend apps, docs or logs.
