# Task 188 - Flutterwave Wallet Top-Up Return QA

## Scope

Verify that Flutterwave wallet top-up returns customers to the KariGO Customer App wallet screen and that wallet credit still depends only on backend verification or webhook processing.

## Expected Return Flow

1. Customer opens `Profile > KariGO Wallet`.
2. Customer enters an amount at or above the configured minimum.
3. Customer taps `Top up with Flutterwave`.
4. Flutterwave hosted checkout opens externally.
5. After payment, Flutterwave redirects to the configured return URL.
6. The web fallback bridge at `/payment/flutterwave/return` opens the Customer App wallet route:
   `karigo-customer:///profile/wallet?topUpReference=<reference>&verifyWalletTopUp=1`
7. Customer App extracts the reference and calls the backend wallet top-up verification endpoint.
8. Wallet balance updates only after the backend verifies successful Flutterwave payment evidence.

## Safe Fallback

If the app does not open automatically, the fallback page should show:

`Payment received. Please return to the KariGO app and tap Verify Wallet Top-Up.`

The fallback page must not show provider payloads, payment secrets, tokens, card details, customer private data, or direct artifact links.

## Backend Environment Notes

Use Render or the approved secret manager only. Do not commit values.

- `CUSTOMER_WEB_PAYMENT_FALLBACK_URL` should point to the HTTPS fallback page, for example `/payment/flutterwave/return`.
- `CUSTOMER_APP_DEEP_LINK_BASE` may use the existing production app scheme, for example `karigo-customer://`.
- `CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL` may be used for a direct wallet return URL only if the provider accepts app-scheme redirects.

## Verification Results Template

- Flutterwave checkout opened externally:
- Payment completed:
- Fallback page loaded:
- Customer App wallet route opened:
- Reference extracted:
- Backend verification result:
- Wallet top-up status:
- Wallet balance updated after verification:
- Admin wallet top-up record:
- Notes/follow-up:
