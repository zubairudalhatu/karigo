# Task 179 - Flutterwave Customer Checkout

Date: 2026-07-19

## Purpose

KariGO is replacing customer-facing Squad checkout with Flutterwave for online order payment while keeping Pay on Delivery stable. Squad remains visible only for Admin diagnostics/internal review until a separate reopening task approves it.

Do not commit or paste Flutterwave live keys, public keys, webhook secrets, encryption keys, card details, `.env` files, APK/AAB files, keystores, screenshots or artifact URLs.

## Payment Position

- Primary online customer checkout provider: Flutterwave
- Operational fallback: Pay on Delivery
- Squad customer checkout: disabled/internal review
- Monnify and Paystack: pending approval/future secondary providers
- Wallet top-up: disabled
- Wallet order payment: disabled
- Payment success source of truth: backend verification or webhook only

## Backend Flow

1. Customer creates an order with `paymentMethod=FLUTTERWAVE`.
2. Backend creates a pending `Payment` record linked to the order.
3. Backend requests a Flutterwave v4 OAuth access token using server-side client credentials.
4. Backend calls Flutterwave hosted checkout using the server-side bearer token only.
5. Backend returns safe fields to the Customer App:
   - `provider`
   - `transactionReference`
   - `authorizationUrl`
   - `checkoutUrl`
   - `paymentUrl`
   - `url`
6. Customer App opens the HTTPS Flutterwave checkout URL externally.
7. Order remains pending until backend verification/webhook confirms:
   - provider reference matches
   - amount matches
   - currency matches
   - provider status is successful

## Required Render Environment Variables

Recommended production state after this task:

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=flutterwave
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
FLUTTERWAVE_ENVIRONMENT=live
FLUTTERWAVE_CLIENT_ID=<set in Render only>
FLUTTERWAVE_CLIENT_SECRET=<set in Render only>
FLUTTERWAVE_PUBLIC_KEY=<set in Render only if needed>
FLUTTERWAVE_BASE_URL=https://f4bexperience.flutterwave.com/
FLUTTERWAVE_TOKEN_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLUTTERWAVE_REDIRECT_URL=<public HTTPS redirect/callback URL>
FLUTTERWAVE_CALLBACK_URL=<optional legacy alias if used>
FLUTTERWAVE_SECRET_HASH=<set in Render only>
FLUTTERWAVE_WEBHOOK_SECRET=<optional alias if used>
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Use either `FLUTTERWAVE_SECRET_HASH` or `FLUTTERWAVE_WEBHOOK_SECRET` according to the provider dashboard setup. Do not store either value in source control.

`FLUTTERWAVE_SECRET_KEY` is a legacy/v3 credential name and is not used for the v4 live hosted-checkout authentication path.

## Public Config Expectations

The Customer App should receive:

```json
{
  "livePaymentsEnabled": true,
  "activeProvider": "flutterwave",
  "customerSelectableProviders": ["flutterwave"],
  "flutterwaveCustomerCheckoutEnabled": true,
  "flutterwaveReady": true,
  "squadCustomerCheckoutEnabled": false,
  "walletTopUpEnabled": false,
  "walletPaymentsEnabled": false,
  "cashPaymentEnabled": true
}
```

If Flutterwave is not fully configured or customer checkout is disabled, Customer App must fall back to Pay on Delivery where enabled.

## Flutterwave References

- Flutterwave hosted Standard checkout creates a payment link from server-supplied transaction details: https://developer.flutterwave.com/docs/collecting-payments/standard/
- Flutterwave transaction verification by reference is used before marking payment successful: https://developer.flutterwave.com/docs/integration-guides/verify-transaction/
- Flutterwave webhook verification must be checked before processing provider events: https://developer.flutterwave.com/docs/integration-guides/webhooks/

## Guardrails

- Customer App never receives Flutterwave client secrets, access tokens, webhook hashes or webhook payload secrets.
- Customer App never marks an order paid by itself.
- Flutterwave checkout URLs must be HTTPS and opened externally, not routed through Expo Router.
- Squad must not appear in live customer checkout while `SQUAD_CUSTOMER_CHECKOUT_ENABLED=false`.
- Wallet top-up remains disabled until a wallet-specific verification task approves it.
