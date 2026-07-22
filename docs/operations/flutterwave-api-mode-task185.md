# Task 185 - Flutterwave API Mode Runbook

Date: 2026-07-22

## Purpose

KariGO Flutterwave checkout now has an explicit API mode so the backend does not mix Flutterwave v4 OAuth authentication with the v3 Standard checkout endpoint.

Do not paste Flutterwave secret keys, client secrets, webhook hashes, access tokens, card details, OTPs, `.env` files, screenshots, APK/AAB files, keystores, credentials or artifact URLs into this document.

## Root Cause

Task 184 confirmed that Flutterwave v4 OAuth token retrieval worked, but checkout initialization still failed with HTTP 404 because the backend called:

```text
baseHost=f4bexperience.flutterwave.com
path=/payments
```

Flutterwave Standard hosted checkout is the v3 flow and creates links with:

```text
POST https://api.flutterwave.com/v3/payments
```

The v4 Orders flow is different and uses `/orders` with OAuth plus direct API order/payment-method fields. KariGO must not call `/payments` in v4 mode unless Flutterwave separately documents and approves that path.

## Immediate Launch Direction

Use Flutterwave v3 Standard checkout for hosted payment links:

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=flutterwave
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
FLUTTERWAVE_ENVIRONMENT=live
FLUTTERWAVE_API_MODE=v3
FLUTTERWAVE_SECRET_KEY=<Render secret only>
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
FLUTTERWAVE_CHECKOUT_PATH=/payments
FLUTTERWAVE_REDIRECT_URL=<public HTTPS redirect/callback URL>
FLUTTERWAVE_SECRET_HASH=<Render secret only>
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Optional aliases:

```text
FLUTTERWAVE_CALLBACK_URL=<legacy alias for redirect URL>
FLUTTERWAVE_WEBHOOK_SECRET=<legacy alias for secret hash>
```

## V4 Mode Guardrail

Keep v4 support only for a later approved direct API/payment-method flow:

```text
FLUTTERWAVE_API_MODE=v4
FLUTTERWAVE_BASE_URL=https://f4bexperience.flutterwave.com
FLUTTERWAVE_CLIENT_ID=<Render secret only>
FLUTTERWAVE_CLIENT_SECRET=<Render secret only>
FLUTTERWAVE_TOKEN_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLUTTERWAVE_V4_CHECKOUT_PATH=/orders
```

In v4 mode, KariGO must not use `/payments`. If `FLUTTERWAVE_V4_CHECKOUT_PATH=/payments`, backend startup/readiness should fail safely and payment initialization should return a safe endpoint/config error.

## Safe Backend Diagnostics

Backend logs may include only safe metadata:

- `apiMode`
- Flutterwave environment
- base host
- endpoint path
- HTTP status code
- response key names
- data key names
- whether a hosted link was found
- link alias, for example `data.link` or `data.next_action.redirect_url.url`

Backend logs must not include:

- Flutterwave secret key
- Flutterwave client secret
- OAuth access token
- `Authorization` header value
- webhook secret/hash
- full provider payload
- hosted checkout URL
- card, bank, OTP or customer token values

## Verification

1. Set Render variables for v3 Standard checkout.
2. Redeploy backend.
3. Confirm Admin Portal > Payment Readiness shows:
   - API mode: `v3 Standard checkout`
   - V3 secret configured: Yes
   - V3 hosted checkout ready: Yes
   - Webhook configured: Yes
   - Callback configured: Yes
4. Start a low-value Customer App order with Flutterwave.
5. Confirm backend logs show `apiMode=v3`, `baseHost=api.flutterwave.com`, `path=/payments`, and `linkAlias=data.link`.
6. Confirm the Customer App opens the HTTPS Flutterwave checkout externally.
7. Confirm payment is marked successful only after backend verification/webhook evidence matches reference, amount and currency.
8. Confirm Pay on Delivery remains available for supported Kano/Abuja orders.

## Official References

- Flutterwave v3 Standard API: https://developer.flutterwave.com/v3.0/reference/checkout
- Flutterwave Standard hosted checkout flow: https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
- Flutterwave v4 Orders API: https://flutterwaveinc.mintlify.app/v4-api-reference/orders/create-an-order
