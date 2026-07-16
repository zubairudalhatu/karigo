# Task 140 - Sandbox Payment Provider Error Fix

## Scope

This record documents the Task 140 fix for Customer App sandbox payment
initialization errors after the fresh Task 138 APK.

Live Paystack, live Monnify, live Squad, live wallet top-up, automatic refunds,
payout automation, live rides, Accelerate.ng utilities and marketing messages
remain disabled.

## Observed Issue

During live staging testing:

- the Customer App payment selector appeared correctly;
- `Mock payment`, `Paystack Test Mode`, `Monnify Sandbox` and `Squad Sandbox`
  were visible;
- choosing Paystack Test Mode returned a generic `Internal server error`.

## Root Cause Addressed

The sandbox payment adapters required a customer email before initializing hosted
checkout. KariGO pilot users can be phone-first, so a valid customer account may
not always have an email address.

The payment failure path also attempted to write a failure notification before
returning the provider error. If that secondary notification write failed, the
useful provider/configuration error could be masked by a generic server error.

## Backend Fix

- Paystack, Monnify and Squad sandbox adapters now use the customer's email when
  available.
- If no email is available, the adapter generates a non-sensitive sandbox email
  from the transaction reference:

```text
checkout+<payment-reference>@sandbox.karigo.com.ng
```

- The generated sandbox email does not include the customer phone number,
  password, OTP, device token, card details or provider credential.
- The fallback is guarded by the existing test/sandbox mode checks.
- Provider initialization failures are recorded safely, but notification-recording
  failures no longer hide the original payment-provider error.

## Customer App Fix

The Customer App now shows provider-specific startup guidance instead of leaving
testers with a raw generic error.

Expected fallback copy pattern:

```text
<Provider label> could not be started. <safe backend reason>. You can select Mock payment to continue staging checkout while sandbox configuration is reviewed.
```

## Required Staging Environment

Default first-pilot mode remains:

```text
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

For controlled provider-by-provider sandbox verification, configure only the
selected provider's sandbox variables in the staging secret manager. Do not place
values in Git.

Paystack Test Mode:

```text
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=
PAYSTACK_BASE_URL=
PAYSTACK_CALLBACK_URL=
```

Monnify Sandbox:

```text
MONNIFY_MODE=sandbox
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_BASE_URL=
MONNIFY_CALLBACK_URL=
```

Squad Sandbox:

```text
SQUAD_MODE=sandbox
SQUAD_SECRET_KEY=
SQUAD_BASE_URL=
SQUAD_CALLBACK_URL=
```

## Verification Notes

- Test one sandbox provider at a time.
- Do not use live cards, live bank accounts, live transfer details or live
  provider keys.
- If a sandbox provider is not configured, the expected result is a safe customer
  message and successful fallback to `Mock payment`.
- The Customer App must never receive provider secret keys.
- The backend remains the only place where sandbox provider credentials are read.
