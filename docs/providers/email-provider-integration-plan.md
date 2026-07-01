# Email Provider Integration Plan

## Current Status

- `EMAIL_PROVIDER=mock` is the only permitted mode.
- The email provider registry supports `mock`, `smtp`, `sendgrid`, `mailgun`, and `ses`.
- SMTP, SendGrid, Mailgun, and Amazon SES are deliberate hard placeholders and cannot
  send email.
- The mock provider logs a masked recipient and subject only. It never logs message
  bodies, credentials, or sensitive metadata.
- EMAIL-channel notifications resolve the user's email address and render a branded
  transactional template. In-app notifications remain the primary channel.
- Email delivery failures are caught by `NotificationsService` and cannot break core
  order, payment, support, or settlement workflows.
- Task 34 leaves all non-mock providers disabled. `MDR-013` must select an SMTP sandbox/
  test inbox or SendGrid assessment before one adapter is implemented and tested.
- Automated rendering now covers every catalogue template and rejects unresolved tokens.

## Provider Structure

Provider and template code lives under:

`services/backend-api/src/modules/notifications/email/`

- `EmailProvider` defines provider-neutral delivery.
- `EmailProviderRegistry` selects `EMAIL_PROVIDER`.
- `MockEmailProvider` safely accepts development delivery.
- SMTP, SendGrid, Mailgun, and SES providers remain placeholders.
- `EmailService` renders and sends stable named templates.
- `EmailNotificationProvider` bridges existing notification events to email.

## Required Environment Variables

```dotenv
EMAIL_PROVIDER=mock
EMAIL_FROM=no-reply@karigo.com.ng
EMAIL_REPLY_TO=support@karigo.com.ng
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
SENDGRID_API_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
AWS_SES_REGION=
AWS_SES_ACCESS_KEY_ID=
AWS_SES_SECRET_ACCESS_KEY=
```

Use test/sandbox credentials only during approved testing. Never commit real credentials.

## Transactional Use Cases

- Customer welcome, future OTP fallback, orders, payment receipt, status, completion,
  refunds, and support updates
- Vendor onboarding, future approval, new paid order, and settlement paid
- Rider onboarding, future approval, and earning paid
- Admin critical support/payment alerts and future daily operations summary

See `docs/providers/email-template-catalogue.md` for the complete catalogue.
Task 34 activation records are in `email-sandbox-activation-readiness-check.md`,
`staging-email-provider-configuration.md`, and
`email-sandbox-activation-decision-log.md`.

## Template Rules

- KariGO red, charcoal, white, and light-grey presentation
- Simple HTML plus plain-text fallback
- Escaped variables and explicit required-variable validation
- No external images or tracking pixels
- No sensitive customer/payment details in subject lines
- Backend-owned payment/order values only

## Sandbox Testing

1. Select one provider after approval.
2. Verify sender domain and configure SPF, DKIM, and DMARC.
3. Store test credentials outside source control.
4. Implement its provider adapter and sandbox/test-inbox behavior.
5. Test rendering, missing variables, provider timeout, bounce handling, masking, and
   workflow non-blocking behavior.
6. Keep `EMAIL_PROVIDER=mock` until the test review passes.

## Production Go-Live Checklist

- [ ] Sending domain and sender identities approved
- [ ] SPF, DKIM, and DMARC verified
- [ ] Provider credentials stored in a secret manager
- [ ] Queue/retry and dead-letter behavior implemented
- [ ] Bounce and complaint webhooks authenticated
- [ ] Delivery, failure, and suppression monitoring enabled
- [ ] Transactional and future marketing consent separated
- [ ] Templates reviewed for privacy and legal content
- [ ] Mock-only startup guard replaced by explicit production approval
