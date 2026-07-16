# Task 145 - Sandbox Provider Initialization Debug

Date: 2026-07-16
Scope: Paystack Test Mode, Monnify Sandbox and Squad Sandbox checkout initialization

## Current Payment Posture

- Default pilot payment mode remains `mock`.
- Live Paystack, Monnify and Squad payments remain disabled.
- Customer App may select sandbox providers for controlled test checkout only.
- Provider credentials must stay in Render environment variables or an approved secret manager.
- No payment keys, webhook secrets, test cards or provider dashboard evidence should be committed.

## Investigation Summary

The Customer App provider selection path is correct:

- Checkout sends the selected `paymentProvider`.
- Retry payment sends the selected `paymentProvider`.
- Backend DTO accepts `paystack`, `monnify`, `squad` and `mock` test-provider values.
- Backend routing uses the customer-selected sandbox provider when `paymentProvider` is present, even if `PAYMENTS_PROVIDER=mock`.

The main implementation gap was in the provider initialization layer:

- Payment Readiness checked whether required environment variables were present.
- Actual initialization still had to call the provider API.
- The sandbox adapters assumed `PAYMENTS_LIVE_ENABLED` was always a string and called `.trim()`.
- The backend config layer can normalize this value to boolean `false`.
- That caused sandbox provider startup to fail before provider handoff even when the readiness page looked green.

## Fix Applied

- Paystack, Monnify and Squad adapters now safely normalize string, boolean and numeric config values.
- Provider initialization errors now include safe internal diagnostics:
  - `config-read`
  - `auth-token`
  - `initialize-transaction`
  - `provider-response`
- Customer-facing errors remain generic and safe.
- Admin-only diagnostics now record safe provider stage/status/message without returning secrets.
- Admin Payment Readiness now includes a safe sandbox initialization test action for Paystack, Monnify and Squad.

## Admin Test Endpoint

Endpoint:

```text
POST /api/v1/admin/payments/provider-readiness/test
```

Body:

```json
{
  "provider": "monnify"
}
```

Allowed providers:

```text
paystack
monnify
squad
```

Response contains only safe fields:

- provider
- mode
- success/failure
- initialization stage
- HTTP status when available
- safe provider message
- transaction reference generated for the test
- whether an authorization URL was present
- whether an access code was present
- timestamp

The endpoint does not:

- return payment keys;
- return webhook secrets;
- store a customer payment record;
- mark any order paid;
- activate live payments;
- create wallet, refund, settlement or payout activity.

## Provider-Specific Debug Notes

### Monnify

Most likely failure stages:

- `config-read`: missing `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE` or sandbox mode.
- `auth-token`: Monnify rejected the API key/secret pair or sandbox base URL.
- `initialize-transaction`: contract code, callback URL, amount, reference or sandbox account setup issue.

### Paystack

Most likely failure stages:

- `config-read`: missing `PAYSTACK_SECRET_KEY` or `PAYSTACK_MODE=test`.
- `initialize-transaction`: rejected callback URL, key/account mismatch or provider validation issue.

### Squad

Most likely failure stages:

- `config-read`: missing `SQUAD_SECRET_KEY` or `SQUAD_MODE=sandbox/test`.
- `initialize-transaction`: sandbox key format, callback URL, account readiness or provider validation issue.

## Operator Guardrails

- Keep `PAYMENTS_LIVE_ENABLED=false`.
- Keep `PAYMENTS_PROVIDER=mock` until a specific sandbox test window is approved.
- Configure provider secrets in Render only.
- Do not screenshot or paste secret values.
- Use the Admin Payment Readiness page to identify missing keys and provider initialization stage.
- If a sandbox provider still fails, use the safe stage and provider message to correct Render/provider-dashboard configuration.

## Deployment Impact

- Backend redeploy required.
- Admin Portal redeploy required.
- Customer EAS Update not required unless Customer App code changes in a later task.
- Prisma migration not required.
