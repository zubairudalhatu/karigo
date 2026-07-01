# Staging Payment Provider Configuration

Committed values must remain blank. Store every credential in the staging platform's
secret manager, never Git, screenshots, tickets, chat, logs, or documentation.

```dotenv
PAYMENT_PROVIDER=paystack
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
- Base/callback/API URLs and CORS: deployment environment settings with HTTPS and exact
  approved origins.
- Test instruments: use provider-approved test-mode sources outside the repository.

## Activation

1. Record approval in `sandbox-activation-decision-log.md`.
2. Provision a separate staging API/database and HTTPS callback/webhook URLs.
3. Add test credentials through the secret manager.
4. Set `PAYMENT_PROVIDER=paystack` and redeploy/restart the backend.
5. Verify health, startup validation, callback/webhook reachability, then run the sandbox test script.

If credentials are absent or invalid, explicit Paystack selection fails startup. This is
intentional fail-closed behavior. When `PAYMENT_PROVIDER` is unset, KariGO defaults to mock.

## Rollback

Set `PAYMENT_PROVIDER=mock`, remove/disable Paystack staging credentials as appropriate,
restart/redeploy, run health and mock payment smoke checks, and record the rollback.
