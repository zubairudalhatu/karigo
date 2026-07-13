# Staging Payment Provider Configuration

Committed values must remain blank. Store every credential in the staging platform's
secret manager, never Git, screenshots, tickets, chat, logs, or documentation.

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
APP_URL=
CORS_ORIGINS=
```

## Storage And Exposure

- Secret key and webhook secret: backend staging secret manager only.
- Public key: staging configuration only if the approved frontend flow needs it; never
  confuse it with the secret key.
- `PAYSTACK_MODE` must remain `test` for staging verification.
- `PAYMENTS_LIVE_ENABLED` must remain `false`; KariGO must not accept live Paystack
  checkout until a separate production go-live approval is recorded.
- `PAYMENTS_PROVIDER` is the preferred current selector; `PAYMENT_PROVIDER` remains
  documented for backward compatibility.
- Base/callback/API URLs and CORS: deployment environment settings with HTTPS and exact
  approved origins.
- Test instruments: use provider-approved test-mode sources outside the repository.

## Activation

1. Record approval in `sandbox-activation-decision-log.md`.
2. Provision a separate staging API/database and HTTPS callback/webhook URLs.
3. Add test credentials through the secret manager.
4. Set `PAYSTACK_MODE=test`, `PAYMENTS_LIVE_ENABLED=false`,
   `PAYMENTS_PROVIDER=paystack` and, if still used by deployment scripts,
   `PAYMENT_PROVIDER=paystack`.
5. Redeploy/restart the backend.
6. Verify health, startup validation, callback/webhook reachability, then run the sandbox test script.

If credentials are absent, not test-mode keys, or `PAYSTACK_MODE` is not `test`, explicit
Paystack selection fails closed before contacting Paystack. When no provider selector is
set, KariGO defaults to mock.

## Rollback

Set `PAYMENTS_PROVIDER=mock` and `PAYMENT_PROVIDER=mock`, keep
`PAYMENTS_LIVE_ENABLED=false`, remove/disable Paystack staging credentials as appropriate,
restart/redeploy, run health and mock payment smoke checks, and record the rollback.
