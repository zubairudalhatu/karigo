# Task 170 Live Payment and Wallet Verification

## Scope

This record covers Customer App Squad checkout handling, payment retry, wallet top-up initiation and wallet top-up verification.

## Expected Behaviour

- Order payment URLs from Squad must open externally through the OS browser/custom tab.
- The app must accept only HTTPS hosted checkout URLs for real providers.
- The app must not route `https://pay.squadco.com/...` through Expo Router.
- The Customer App shows pending payment/top-up state only after the external checkout page opens.
- Backend verification or provider webhook is required before an order is marked paid or a wallet top-up is credited.
- Wallet top-up verification uses `GET /api/v1/payments/wallet-top-ups/verify/:transactionReference`.
- Duplicate verification must not double-credit wallet balance.

## Manual QA

1. Start a Customer App checkout with Squad by GTBank.
2. Confirm the Squad hosted checkout opens outside the app.
3. Cancel the provider checkout and return to KariGO.
4. Confirm the order remains awaiting payment and the app shows a verify/retry path.
5. Complete a low-value approved live test only after payment approval is explicitly granted.
6. Tap `Verify payment status`.
7. Confirm the backend marks the order paid only after provider verification succeeds.
8. Start a wallet top-up from `Profile -> KariGO Wallet`.
9. Confirm the Squad top-up checkout opens externally.
10. Return to KariGO and tap `Verify wallet top-up`.
11. If the provider has not confirmed payment, confirm the app shows: `Payment not confirmed yet. Please try again after a moment.`
12. After verified payment/webhook, confirm wallet balance increases once and ledger status is posted once.

## Guardrails

- Do not record checkout URLs, transaction secrets, webhook secrets, payment keys or card data in this document.
- Wallet order payment remains controlled by `WALLET_PAYMENTS_ENABLED`.
- Mock payment remains staging/testing fallback only.
- Monnify and Paystack remain pending/future secondary providers.
