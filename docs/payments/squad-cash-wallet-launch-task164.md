# Task 164 - Squad, Cash/POD and Wallet Launch Payment Notes

## Squad by GTBank

Squad is the primary launch payment provider. Customer checkout should show Squad by GTBank as the only online payment option when backend public config reports:

```text
livePaymentsEnabled=true
activeProvider=squad
customerSelectableProviders=squad
mockPaymentVisible=false
```

The Customer App now treats hosted Squad authorization URLs as external HTTPS URLs. It must open the Squad page in the browser/custom-tab path instead of routing the URL through Expo Router. Payment remains pending until backend verification or webhook processing confirms success.

No Squad key, webhook secret, test card, live card, or provider dashboard credential belongs in Git.

## Squad Failure Fix

Observed failure: Squad checkout URL opened inside Expo Router and displayed `Unknown Page 404`.

Fix: the Customer App external payment helper now:

- accepts only HTTPS authorization URLs;
- opens hosted URLs with the browser/native linking path;
- avoids internal app routing for `https://pay.squadco.com/...`;
- keeps mock authorization handling separate;
- requires the user to return to KariGO and tap verify payment.

## Cash / Pay on Delivery

Cash/POD launch copy and backend public readiness flags are now available, but full cash order processing is not activated in this task.

Current safe rule:

- cash orders must not be marked electronically paid;
- customers must pay only the amount shown in the app;
- Admin/Vendor/Captain reconciliation requires a dedicated cash-pending payment method/order workflow before operational use.

Required follow-up before enabling live cash orders:

- persist payment method on order or a safe offline-payment record;
- expose cash payment method to Admin, Vendor Dashboard and Captain App;
- keep order unpaid/cash-pending until collection is reconciled;
- record who collected cash and when;
- include cash collection in settlement/reconciliation reports.

## Wallet Top-Up and Wallet Payment

Wallet balance and ledger visibility already exist. Task 164 adds public readiness flags and customer-facing guardrails only.

Wallet money movement remains disabled until a backend-verified flow exists:

- wallet top-up via Squad must credit wallet only after backend payment verification/webhook/manual confirmation;
- wallet order payment must debit atomically server-side before an order is treated as paid;
- insufficient wallet balance must block wallet payment;
- refunds remain admin-reviewed and must not be auto-credited unless separately approved.

## Environment Variable Names

Use Render or an approved secret manager only:

```text
PAYMENTS_PROVIDER
PAYMENTS_LIVE_ENABLED
SQUAD_MODE
SQUAD_SECRET_KEY
SQUAD_BASE_URL
SQUAD_CALLBACK_URL
SQUAD_WEBHOOK_SECRET
SQUAD_LIVE_ACTIVATION_APPROVED
CASH_ON_DELIVERY_ENABLED
WALLET_TOP_UP_ENABLED
WALLET_PAYMENTS_ENABLED
MARKETING_ENABLED
BULK_MESSAGING_ENABLED
```
