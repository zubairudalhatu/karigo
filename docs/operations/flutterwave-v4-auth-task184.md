# Task 184 - Flutterwave V4 Authentication Runbook

Date: 2026-07-19

## Purpose

KariGO Flutterwave live checkout now uses Flutterwave v4 OAuth client-credentials authentication before creating a hosted checkout. This runbook records the safe Render configuration and verification steps without storing payment credentials in source control.

Do not paste Flutterwave client secrets, access tokens, webhook hashes, card details, OTPs, `.env` files, screenshots, APK/AAB files, keystores, credentials or artifact URLs into this document.

## Root Cause Addressed

The backend was calling the Flutterwave v4 production host while authenticating with the older secret-key bearer pattern. Flutterwave rejected the request with HTTP 401 before returning a hosted checkout link.

The corrected flow is:

1. Backend requests an OAuth access token from Flutterwave using `client_id`, `client_secret` and `grant_type=client_credentials`.
2. Backend caches the token in memory until near expiry.
3. Backend calls the configured checkout endpoint with `Authorization: Bearer <access_token>`.
4. If Flutterwave returns 401 once, backend refreshes the token and retries the checkout request once.
5. Backend returns only safe checkout fields to the Customer App: `authorizationUrl`, `checkoutUrl`, `paymentUrl`, `url`, `provider`, `reference`, `amount` and `currency`.

## Required Render Environment

Set values in Render only:

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=flutterwave
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_ENVIRONMENT=live
FLUTTERWAVE_BASE_URL=https://f4bexperience.flutterwave.com/
FLUTTERWAVE_CLIENT_ID=<from Flutterwave v4 dashboard>
FLUTTERWAVE_CLIENT_SECRET=<from Flutterwave v4 dashboard>
FLUTTERWAVE_SECRET_HASH=<same value configured in Flutterwave webhook settings>
FLUTTERWAVE_REDIRECT_URL=<KariGO return URL>
CASH_ON_DELIVERY_ENABLED=true
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Optional aliases:

```text
FLUTTERWAVE_CALLBACK_URL=<legacy alias for redirect URL>
FLUTTERWAVE_WEBHOOK_SECRET=<legacy alias for secret hash>
FLUTTERWAVE_TOKEN_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLUTTERWAVE_CHECKOUT_PATH=/payments
```

`FLUTTERWAVE_SECRET_KEY` is a legacy/v3 credential name and is not used for v4 live checkout authentication.

## Checkout Endpoint Note

KariGO keeps the hosted-checkout path configurable through `FLUTTERWAVE_CHECKOUT_PATH`, defaulting to `/payments`.

Flutterwave v4 also documents an `/orders` API, but that flow requires provider-side `customer_id` and `payment_method_id` inputs and should not replace the hosted-checkout flow without a separate approved integration task.

## Safe Diagnostics

Backend logs may include:

- provider name;
- environment;
- base host;
- checkout path;
- HTTP status code;
- response key names;
- data key names;
- token fetched yes/no;
- token expiry seconds;
- whether checkout link was found;
- hosted link alias, for example `data.link`.

Backend logs must not include:

- Flutterwave client secret;
- OAuth access token value;
- `Authorization` header value;
- webhook secret/hash;
- full provider payload;
- hosted checkout URL;
- card, bank, OTP or customer token values.

## Failure Behavior

If v4 authentication fails, backend returns:

```text
error_code=FLUTTERWAVE_AUTH_FAILED
message=Flutterwave authentication failed.
```

Customer App should show:

```text
Flutterwave checkout is temporarily unavailable. Please use Pay on Delivery.
```

Pay on Delivery must remain available for supported orders while Flutterwave is reviewed.

## Verification Steps

1. Confirm backend health:

```text
GET /api/v1/health
```

2. Open Admin Portal > Payment Readiness and confirm:
   - Flutterwave is the primary launch provider;
   - v4 credentials configured: Yes;
   - access-token/auth readiness: Ready for token request;
   - live mode configured: Yes;
   - webhook configured: Yes;
   - callback configured: Yes;
   - low-value live test required remains an operations check, not a config blocker.

3. Create a Customer App order with Flutterwave selected.
4. Confirm backend logs show token fetch and checkout initialization with safe metadata only.
5. Confirm Customer App opens a Flutterwave HTTPS hosted checkout externally.
6. Complete or cancel the low-value test transaction according to the approved operations script.
7. Confirm order payment status changes only after backend verification/webhook evidence matches reference, amount and currency.

## Rollback

If Flutterwave checkout still fails during live verification:

```text
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=false
CASH_ON_DELIVERY_ENABLED=true
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Redeploy backend after changing Render variables. Customer App should fall back to Pay on Delivery for supported orders.
