# WhatsApp Provider Integration Plan

## Current Status

- `WHATSAPP_PROVIDER=mock` is the only permitted mode.
- The provider registry supports `mock` and `meta_cloud`.
- The mock provider logs only a masked phone number and template name.
- Meta WhatsApp Cloud is a hard placeholder and cannot send messages or process
  webhooks.
- WhatsApp delivery occurs only when a workflow explicitly requests the `WHATSAPP`
  channel. Existing workflows remain in-app-first.
- Provider failures are caught by `NotificationsService` and cannot break operational
  workflows.
- Task 36 removes generic content fallback, disables unrestricted text sends, adds
  role-aware vendor/rider templates, and verifies every catalogue entry in mock tests.
- `MDR-015` remains open; Meta sending/webhook adapters, consent controls, credentials,
  approved templates/recipients, and deployed staging are absent.

## Provider Structure

Code lives under `services/backend-api/src/modules/notifications/whatsapp/`.

- `WhatsAppProvider` defines template/text delivery, webhook verification/handling, and
  optional health checks.
- `WhatsAppProviderRegistry` selects `WHATSAPP_PROVIDER`.
- `MockWhatsAppProvider` safely accepts mock operational messages.
- `MetaWhatsAppCloudProvider` remains disabled.
- `WhatsAppService` validates and routes stable named templates.
- `WhatsAppNotificationProvider` bridges explicit WhatsApp-channel notifications to the
  recipient's phone number.

## Environment Variables

```dotenv
WHATSAPP_PROVIDER=mock
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v20.0
```

Use sandbox/test credentials only after approval. Never commit real credentials.

## Operational Scope

Initial scope is limited to high-value operational events: future OTP fallback, order and
payment confirmations, delivery updates, refunds, support updates, vendor new orders,
and rider job assignment.

Marketing remains out of scope until explicit consent, template approval, preference
controls, opt-out/suppression, and compliance review exist.

See:

- `docs/providers/whatsapp-template-catalogue.md`
- `docs/providers/whatsapp-consent-and-compliance-notes.md`
- `docs/providers/whatsapp-sandbox-activation-readiness-check.md`
- `docs/providers/staging-whatsapp-provider-configuration.md`
- `docs/providers/staging-whatsapp-webhook-setup-guide.md`

## Future Meta Cloud Sending Flow

1. Confirm recipient opt-in and message purpose.
2. Select an approved, versioned template.
3. Render validated variables without sensitive unnecessary data.
4. Send server-side through Meta Cloud.
5. Store provider message ID and operational metadata.
6. Process delivery/read/failure callbacks idempotently.
7. Stop sending after opt-out or suppression.

## Webhook Verification Plan

- Verify Meta webhook challenge token.
- Verify request signatures using raw request bodies where applicable.
- Process callback IDs idempotently.
- Never trust callback status without signature verification.
- Do not log access tokens or complete message content.

## Sandbox Testing

Test opted-in and opted-out recipients, approved/unapproved templates, missing variables,
malformed numbers, provider timeouts, duplicate callbacks, token rotation, delivery
failures, and workflow non-blocking behavior.

## Production Go-Live Checklist

- [ ] WhatsApp Business account and phone number approved
- [ ] Operational templates approved by Meta
- [ ] Explicit consent source/time stored
- [ ] Opt-out and suppression controls implemented
- [ ] Provider credentials stored in secret manager
- [ ] Webhook verification and idempotency implemented
- [ ] Delivery/failure monitoring enabled
- [ ] Message frequency limits approved
- [ ] Privacy/compliance review complete
- [ ] Mock-only startup guard replaced by explicit production approval
