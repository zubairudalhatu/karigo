# Task 122 Sandbox Payment Verification Runbook

## Purpose

Run controlled sandbox verification for Paystack, Monnify and Squad one provider at a
time while keeping KariGO's first Kano pilot default payment mode as mock payment.

This runbook does not activate live payments, live utilities, wallet withdrawals,
automatic refunds, ride dispatch, payouts, Pharmacy marketplace, provider login,
marketing SMS/email, newsletters or bulk messaging.

## Current Payment Position

```text
Default pilot payment: Mock payment
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
Live payments: disabled
Wallet auto-credit/refund: disabled
Wallet withdrawal: disabled
Vendor payout automation: disabled
Captain payout automation: disabled
Accelerate.ng utilities: future integration, not active
```

## Verification Rules

- Test only one payment provider at a time.
- Store all credentials only in Render or the approved staging secret manager.
- Do not put Paystack, Monnify or Squad secret keys in frontend apps.
- Do not commit API keys, webhook secrets, provider screenshots, test cards, .env files
  or raw webhook payloads.
- Use server-side payment verification only.
- Roll back to mock payment immediately after each controlled test window unless the
  payment owner approves continued sandbox testing.

## Pre-Verification Checklist

| Item | Expected state | Status | Evidence |
| --- | --- | --- | --- |
| Backend deployed from approved commit | Task 121 or later | `Pass / Fail / Blocked` |  |
| Backend health | `/api/v1/health` OK | `Pass / Fail / Blocked` |  |
| Default provider before test | `PAYMENTS_PROVIDER=mock` | `Pass / Fail / Blocked` |  |
| Live payment flag | `PAYMENTS_LIVE_ENABLED=false` | `Pass / Fail / Blocked` |  |
| Customer app/API checkout reachable | Order can be created with mock mode | `Pass / Fail / Blocked` |  |
| Admin/Vendor dashboards reachable | Paid mock order is visible | `Pass / Fail / Blocked` |  |
| Provider test credentials available | Secret manager only | `Pass / Fail / Blocked` |  |
| Provider evidence location ready | Secure location outside Git | `Pass / Fail / Blocked` |  |

## Provider Switch Procedure

1. Confirm mock checkout works.
2. Select only one provider: Paystack, Monnify or Squad.
3. Add that provider's sandbox variables in Render.
4. Confirm `PAYMENTS_LIVE_ENABLED=false`.
5. Redeploy backend.
6. Confirm `/api/v1/health`.
7. Run the provider verification record.
8. Capture only masked evidence references in Git-tracked docs.
9. Switch back to mock payment.
10. Redeploy backend.
11. Run one mock checkout to prove rollback.

## Paystack Test Mode Variables

```dotenv
PAYMENT_PROVIDER=paystack
PAYMENTS_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=
```

## Monnify Sandbox Variables

```dotenv
PAYMENT_PROVIDER=monnify
PAYMENTS_PROVIDER=monnify
PAYMENTS_LIVE_ENABLED=false
MONNIFY_MODE=test
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_WEBHOOK_SECRET=
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_CALLBACK_URL=
```

## Squad Sandbox Variables

```dotenv
PAYMENT_PROVIDER=squad
PAYMENTS_PROVIDER=squad
PAYMENTS_LIVE_ENABLED=false
SQUAD_MODE=test
SQUAD_SECRET_KEY=
SQUAD_WEBHOOK_SECRET=
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_CALLBACK_URL=
```

## Rollback To Mock

```dotenv
PAYMENT_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

After rollback:

- redeploy backend;
- confirm `/api/v1/health`;
- create one order;
- initiate mock payment;
- verify mock payment;
- confirm Admin/Vendor dashboards show the paid order;
- confirm no Paystack, Monnify or Squad request is attempted.

## Blockers

Treat any of these as No-Go for sandbox verification:

- live provider key is configured;
- `PAYMENTS_LIVE_ENABLED=true`;
- provider secret appears in API response, log output, frontend bundle or Git;
- server amount/reference does not match provider evidence;
- invalid webhook signature is accepted;
- failed/cancelled payment moves order to paid;
- rollback to mock fails.
