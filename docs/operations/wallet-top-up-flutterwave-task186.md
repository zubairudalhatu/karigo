# Task 186 - Flutterwave Wallet Top-Up Operations Runbook

This runbook records the controlled launch posture for KariGO Wallet top-up through Flutterwave.

## Scope

- Wallet top-up provider: Flutterwave
- Wallet order payment: disabled
- Wallet withdrawal: disabled
- Automatic refunds: disabled
- Referral reward crediting: disabled
- Subscription billing: disabled
- Squad customer checkout: disabled

Wallet credit must be posted only after backend Flutterwave verification or a verified webhook. The Customer App must never credit wallet balance from a client-side payment result alone.

## Required Render Environment State

Use Render Dashboard -> KariGO backend service -> Environment -> Add/Update Variables -> Save -> Redeploy.

Recommended controlled state:

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=flutterwave
PAYMENT_PROVIDER=flutterwave
FLUTTERWAVE_ENVIRONMENT=live
FLUTTERWAVE_API_MODE=v3
FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true
WALLET_TOP_UP_ENABLED=true
WALLET_PAYMENTS_ENABLED=false
WALLET_MIN_TOP_UP_AMOUNT=100
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
CUSTOMER_WEB_PAYMENT_FALLBACK_URL=https://www.karigo.com.ng/payment/flutterwave/return
CUSTOMER_APP_DEEP_LINK_BASE=karigo-customer://
```

Optional direct app return override:

```text
CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL=karigo-customer:///profile/wallet
```

Use the direct app return override only if Flutterwave accepts app-scheme redirects for the account. Otherwise keep the HTTPS fallback bridge and let the website return page open the app.

Flutterwave secret key, webhook secret/hash, callback/redirect URL and any provider secrets must be stored only in Render or an approved secret manager. Do not commit or paste secret values into source control, screenshots, tickets or docs.

## Customer Flow

1. Customer opens Profile -> KariGO Wallet.
2. Backend public payment config is loaded.
3. If wallet top-up is enabled and Flutterwave is the active customer provider, the screen shows `Top up with Flutterwave`.
4. Customer enters an amount of at least NGN 100, unless `WALLET_MIN_TOP_UP_AMOUNT` sets a higher minimum.
5. Backend creates:
   - pending wallet ledger entry;
   - pending payment record;
   - Flutterwave hosted checkout authorization.
6. Customer completes hosted checkout externally.
7. Flutterwave returns to the website fallback bridge or app deep link with the top-up reference.
8. Customer App opens the wallet screen and verifies the reference, customer taps verify, or Flutterwave webhook is processed.
9. Backend verifies reference, amount and currency.
10. Wallet balance is credited once only.

Expected status labels:

```text
Pending verification
Verified and credited
Failed
Cancelled/expired
```

## Guardrails

- Wallet order payment remains disabled while `WALLET_PAYMENTS_ENABLED=false`.
- Wallet top-up requires `WALLET_TOP_UP_ENABLED=true`, `PAYMENTS_PROVIDER=flutterwave`, `FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true`, and a live-ready Flutterwave checkout provider.
- Duplicate verification/webhook handling must not double-credit the wallet.
- Admin Wallets can view top-up records but cannot manually mark provider top-ups successful.
- Manual wallet adjustments remain separate controlled admin ledger entries.

## Verification Checklist

- [ ] Admin Payment Readiness shows Wallet top-up enabled.
- [ ] Admin Payment Readiness shows Wallet order payment disabled.
- [ ] Customer Wallet shows `Top up with Flutterwave`.
- [ ] Top-up opens Flutterwave externally.
- [ ] Flutterwave return opens the Customer App wallet route or shows the safe website fallback.
- [ ] Wallet ledger shows pending before verification.
- [ ] Verification credits wallet once.
- [ ] Re-verification or duplicate webhook does not credit again.
- [ ] Pay on Delivery order creation still works.
- [ ] Flutterwave order checkout still works.
- [ ] Squad remains hidden from customer checkout.
