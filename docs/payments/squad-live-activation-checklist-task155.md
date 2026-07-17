# Task 155 - Squad Live Activation Checklist

Date: 2026-07-17

## Purpose

Provide the safe activation checklist for enabling Squad by GTBank as KariGO's primary live checkout provider.

Do not activate live payments until every Go criterion is complete and approved.

## Required Render Environment Variables

Set values only in Render or the approved secret manager:

```text
PAYMENTS_PROVIDER=squad
PAYMENTS_LIVE_ENABLED=true
SQUAD_MODE=live
SQUAD_SECRET_KEY=
SQUAD_PUBLIC_KEY=
SQUAD_BASE_URL=
SQUAD_CALLBACK_URL=
SQUAD_WEBHOOK_SECRET=
SQUAD_LIVE_ACTIVATION_APPROVED=true
```

Optional/operational values if Squad dashboard requires them:

```text
SQUAD_MERCHANT_ID=
SQUAD_BUSINESS_ID=
```

Do not commit values.

## Squad Dashboard Setup

Confirm in the Squad dashboard or with Squad support:

- business account approved for KariGO;
- live API access enabled;
- correct live base URL;
- callback/redirect URL configured;
- webhook URL configured;
- webhook signing secret configured;
- NGN currency support confirmed;
- amount format confirmed as minor units/kobo;
- customer email and phone requirements confirmed;
- transaction reference format accepted by Squad.

Webhook URL format:

```text
https://<backend-domain>/api/v1/payments/webhook/squad
```

Current staging/backend example:

```text
https://karigo-8htn.onrender.com/api/v1/payments/webhook/squad
```

Use the approved production backend domain for public launch when available.

## Activation Procedure

1. Confirm finance/management approval is recorded outside Git.
2. Confirm Squad live credentials are stored only in Render/secret manager.
3. Set `PAYMENTS_PROVIDER=squad`.
4. Set `PAYMENTS_LIVE_ENABLED=true`.
5. Set `SQUAD_MODE=live`.
6. Set `SQUAD_SECRET_KEY`, `SQUAD_BASE_URL`, `SQUAD_CALLBACK_URL` and `SQUAD_WEBHOOK_SECRET`.
7. Set `SQUAD_LIVE_ACTIVATION_APPROVED=true` only after approval.
8. Redeploy backend.
9. Confirm Admin Payment Readiness shows Squad ready for live checkout.
10. Publish/build Customer App with `EXPO_PUBLIC_PAYMENT_LAUNCH_MODE=squad_live`.
11. Confirm Customer checkout shows Squad by GTBank only.
12. Run one approved low-value live transaction.
13. Verify backend marks payment successful only after provider verification.
14. Confirm order, Admin payment view and Vendor order status are correct.
15. Record reconciliation evidence privately.

## Go Criteria

- Squad provider approval confirmed.
- Render variables configured without exposing values.
- Admin Payment Readiness shows Squad live readiness as ready.
- Mock payment hidden from public live checkout.
- Monnify and Paystack hidden from public live checkout.
- Webhook signature verification confirmed.
- Callback/redirect flow confirmed.
- One approved live test payment completes and reconciles.
- Refund/escalation owner identified.

## No-Go Criteria

- Any Squad secret missing or invalid.
- Webhook secret missing.
- Callback URL missing or not HTTPS.
- `SQUAD_LIVE_ACTIVATION_APPROVED` not true.
- Customer App still shows Mock in public live checkout.
- Backend marks paid without provider verification.
- Reconciliation owner not assigned.
- Any secret appears in Git, screenshots or shared logs.

## Rollback

For staging/testing rollback:

```text
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
SQUAD_MODE=
SQUAD_LIVE_ACTIVATION_APPROVED=false
```

Then redeploy backend and publish/update Customer App without `EXPO_PUBLIC_PAYMENT_LAUNCH_MODE=squad_live`.

Do not use Mock payment for public live checkout after launch.
