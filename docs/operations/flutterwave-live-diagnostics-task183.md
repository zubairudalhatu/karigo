# Task 183 - Flutterwave Live Checkout Diagnostics

Date: 2026-07-19

## Purpose

Use this runbook while diagnosing Flutterwave hosted-checkout startup issues. Do not record Flutterwave keys, webhook secrets, hashes, card data, OTPs, tokens, screenshots, APK/AAB files or artifact URLs in this document.

## Live-safe fallback environment

Recommended customer-facing fallback while Flutterwave checkout is under review:

```text
CASH_ON_DELIVERY_ENABLED=true
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=false
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Expected result:

- Pay on Delivery remains customer-selectable for supported Kano and Abuja orders.
- Flutterwave is hidden from Customer App checkout until the diagnostic review is complete.
- Squad remains disabled/internal review.
- Wallet top-up and wallet order payment remain disabled.

## Backend diagnostic expectations

Flutterwave initialization should call:

```text
POST /v3/payments
```

The backend should log safe metadata only:

- provider name;
- Flutterwave environment;
- Flutterwave API base host only;
- amount;
- currency;
- transaction reference;
- HTTP status code;
- top-level response key names;
- `data` object key names;
- whether an HTTPS checkout link was found;
- the alias that produced the link, for example `data.link`.

The backend must not log provider secret keys, authorization headers, webhook secret/hash, full provider payloads, hosted checkout URLs, card data or customer tokens.

## Missing checkout link behavior

Flutterwave Standard hosted checkout normally returns the hosted link at:

```text
data.link
```

The backend also accepts safe aliases such as `checkoutUrl`, `authorizationUrl`, `paymentUrl` and `url`.

If no valid HTTPS hosted link is found, the backend returns:

```text
error_code=FLUTTERWAVE_CHECKOUT_LINK_MISSING
message=Flutterwave checkout link was not returned.
```

The response details may include safe diagnostics such as response key names, data key names and status code only.

## QA checks

1. Confirm backend health: `GET /api/v1/health`.
2. Confirm Admin Portal > Payment Readiness shows:
   - Configured: Yes/No;
   - Customer checkout enabled: Yes/No;
   - Live mode configured: Yes/No;
   - Webhook/callback configured: Yes/No;
   - Low-value live test required: Yes, but not a configuration blocker.
3. With `FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=false`, confirm Customer checkout hides Flutterwave and defaults to Pay on Delivery where eligible.
4. Confirm a Kano Kitchen or other Kano vendor order can be created with Pay on Delivery even when the delivery city is a local area such as Tarauni.
5. If Flutterwave is re-enabled for a controlled test, confirm hosted checkout opens externally and no Expo Router `Unknown Page 404` appears.

## Re-enable Flutterwave later

Only after diagnostics confirm a valid HTTPS hosted checkout link:

```text
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
```

Keep Pay on Delivery enabled during the first verification window.
