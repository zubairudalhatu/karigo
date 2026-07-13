# Customer Payment Status Release Note - Task 102

Date prepared: 2026-07-13

## Scope

This note covers the Customer App payment-status polish for staging Paystack Test Mode
verification. It does not activate live Paystack, live wallet funding, withdrawals,
automatic refunds, live payouts, live rides, Pharmacy marketplace or production payments.

## Customer App Channel

- App: KariGO Customer Staging
- EAS channel: `customer-staging`
- Android package: `com.karigo.customer.staging`
- Staging API: `https://karigo-8htn.onrender.com/api/v1`

## Release Options

Use the current KariGO release process:

```powershell
cd apps/customer-app
npx eas-cli update --branch customer-staging --message "Task 102 payment status polish"
```

If a new APK is required instead of an over-the-air update:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-staging
```

## Backend Staging Requirement

Paystack Test Mode credentials must stay only in Render or the staging secret manager.
No Customer App secret is required.

```dotenv
PAYSTACK_MODE=test
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=
PAYSTACK_CALLBACK_URL=
```

Rollback to mock:

```dotenv
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

## Safety Guardrail

Paystack Test Mode, Accelerate utility services, and Termii SMS are integration-ready
concepts only. Live payment collection, live utility fulfilment, wallet refund automation,
SMS sending and payout automation remain disabled until separately approved.

## Post-Release Smoke Check

- Open Checkout with a staged order.
- Confirm `Awaiting payment` copy is visible before payment.
- Start mock payment and confirm mock still completes.
- In Paystack Test Mode, confirm the external authorization page opens.
- Return to KariGO and tap `Verify payment status`.
- Confirm failed/cancelled checkout remains unpaid.
- Confirm successful backend verification marks the order paid.
- Confirm Wallet and refunds copy does not promise automatic refunds or wallet credit.
