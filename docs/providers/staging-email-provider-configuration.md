# Staging Email Provider Configuration

These are blank deployment templates, not environment files. Store credentials, sender
identities, domain details, and test recipients only in the staging secret manager.

Task 112 adds a separate Resend path for account activation email only. Generic
transactional email still remains disabled with `EMAIL_PROVIDER=mock`.

## Account Activation Email Only

```dotenv
EMAIL_PROVIDER=mock
ACCOUNT_ACTIVATION_EMAIL_ENABLED=true
ACCOUNT_ACTIVATION_EMAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_REPLY_TO=
RESEND_BASE_URL=
```

Use this only after controlled staging/pilot approval. It must send only the account
activation email after successful OTP verification. It must not send welcome campaigns,
marketing messages, order updates, support updates, refund notices or promotional email.

## SMTP Sandbox Or Test Inbox

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=
EMAIL_REPLY_TO=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=
```

## SendGrid Assessment

```dotenv
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
```

Mailgun and Amazon SES remain unselected placeholders. Document their equivalent blank
variables only after management selects one; do not configure several providers at once.

## Sender And Domain Requirements

Before sandbox sending, verify the provider-approved sender identity and any required
domain ownership records in an access-controlled provider account. SPF, DKIM, DMARC,
bounce, complaint, and suppression requirements must be reviewed before production.
Never copy verification records or provider-dashboard screenshots into this repository.

## Activation Procedure

1. Close `MDR-013` with the selected provider and accountable owners.
2. Implement and review only that provider's sandbox adapter.
3. Provision a separate staging API/database and approved test inbox.
4. Add variables to the staging secret manager without printing them in logs.
5. Restart or redeploy the backend; provider configuration is read at startup.
6. Run the transactional email test script and store redacted evidence externally.

The current code intentionally rejects `smtp`, `sendgrid`, `mailgun`, and `ses`; adding
variables alone cannot activate sending.

## Rollback To Mock

Set `EMAIL_PROVIDER=mock`, restart or redeploy, and run mock template plus workflow tests.
Remove or revoke the staging provider credentials when the assessment ends.
