# Task 142 - Payment Provider Readiness Runbook

## Scope

Use this runbook to diagnose Paystack, Monnify and Squad sandbox checkout setup
without exposing provider credentials or activating live payments.

## Guardrails

- Do not place payment keys in Git, screenshots, issue comments or shared docs.
- Do not put secret keys in Customer App, Captain App, Admin Portal, Vendor
  Dashboard or Website code.
- Do not set `PAYMENTS_LIVE_ENABLED=true` during sandbox verification.
- Test only one sandbox provider at a time.
- Return to mock payment after each controlled provider test unless management
  approves continued sandbox testing.

## Readiness Check

After backend deployment, an Admin user can check:

```text
GET https://<backend-domain>/api/v1/admin/payments/provider-readiness
```

Expected response characteristics:

- `activeProvider` shows the selected environment provider.
- `providers[].status` shows `READY` or `WAITING_FOR_CONFIGURATION`.
- `providers[].issues` lists safe missing configuration names.
- Secret values are never returned.
- `liveActivation.supportedByCurrentCode` remains `false`.

## Provider-by-Provider Setup

### Paystack Test Mode

1. Set Paystack sandbox variables in the staging secret manager.
2. Keep `PAYMENTS_LIVE_ENABLED=false`.
3. Redeploy backend.
4. Call provider readiness endpoint.
5. Confirm Paystack status is `READY`.
6. Run a controlled checkout from Customer App.
7. Verify payment only through backend/provider confirmation.
8. Return to mock provider when the test window closes.

### Monnify Sandbox

1. Set Monnify sandbox variables in the staging secret manager.
2. Include `MONNIFY_CONTRACT_CODE`.
3. Keep `MONNIFY_BASE_URL` on the sandbox host.
4. Keep `PAYMENTS_LIVE_ENABLED=false`.
5. Redeploy backend.
6. Call provider readiness endpoint.
7. Confirm Monnify status is `READY`.
8. Run a controlled hosted-checkout test.
9. Return to mock provider when the test window closes.

### Squad Sandbox

1. Set Squad sandbox variables in the staging secret manager.
2. Keep `SQUAD_BASE_URL` on the sandbox host.
3. Keep `PAYMENTS_LIVE_ENABLED=false`.
4. Redeploy backend.
5. Call provider readiness endpoint.
6. Confirm Squad status is `READY`.
7. Run a controlled hosted-checkout test.
8. Return to mock provider when the test window closes.

## Troubleshooting Matrix

| Readiness issue | Meaning | Action |
| --- | --- | --- |
| `missing PAYSTACK_MODE` | Paystack mode flag is absent | Set `PAYSTACK_MODE=test` |
| `missing PAYSTACK_SECRET_KEY` | Paystack server key is absent | Add the test secret in the secret manager |
| `missing MONNIFY_API_KEY` | Monnify API key is absent | Add sandbox API key in the secret manager |
| `missing MONNIFY_SECRET_KEY` | Monnify secret is absent | Add sandbox secret in the secret manager |
| `missing MONNIFY_CONTRACT_CODE` | Contract code is absent | Add sandbox contract code |
| `missing SQUAD_MODE` | Squad mode flag is absent | Set `SQUAD_MODE=sandbox` |
| `missing SQUAD_SECRET_KEY` | Squad sandbox key is absent | Add sandbox secret in the secret manager |
| `PAYMENTS_LIVE_ENABLED must be false` | Live mode is enabled | Disable live mode and redeploy |
| `BASE_URL must use HTTPS` | Provider host is not secure | Use an HTTPS sandbox URL |
| `points at a live provider host` | Sandbox is pointing at live API | Replace with provider sandbox URL |

## Rollback

Use the staging secret manager:

```text
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
```

Redeploy backend and verify:

- mock payment checkout starts;
- mock payment verification succeeds;
- no sandbox/live provider request is attempted;
- payment status remains consistent in Customer App, Vendor Dashboard and Admin
  Portal.

## Evidence Rules

Record only:

- provider name;
- readiness status;
- safe missing variable names;
- order/payment references;
- masked customer data.

Do not record:

- provider keys;
- webhook secrets;
- test card details;
- bank details;
- provider dashboard screenshots containing secrets.
