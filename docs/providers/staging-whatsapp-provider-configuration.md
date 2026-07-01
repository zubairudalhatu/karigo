# Staging WhatsApp Provider Configuration

This is a blank deployment template. Never add real credentials, identifiers, recipient
numbers, consent evidence, or provider screenshots to committed files.

```dotenv
WHATSAPP_PROVIDER=meta_cloud
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_BASE_URL=
WHATSAPP_API_VERSION=
WHATSAPP_SANDBOX_MODE=true
```

`meta_cloud` is the provider identifier accepted by the codebase. Keep sandbox mode true
through the complete staging assessment.

## Secret And Operational Data Storage

Store credentials and identifiers in the staging platform secret manager with least-
privilege access. Store approved recipient/consent records in an access-controlled system,
not environment files. Do not print configuration, recipients, template variables, or
provider payloads in deployment diagnostics.

## Activation Procedure

1. Close `MDR-015` and approve the internal recipient/consent cohort.
2. Obtain Meta approval for the exact operational templates.
3. Implement and review the Meta send and webhook adapters.
4. Provision separate HTTPS staging and callback storage/idempotency controls.
5. Add secrets in the staging secret manager and restart/redeploy.
6. Run the sandbox test script and retain redacted evidence externally.

The current environment validator and Meta placeholder prevent activation even if these
variables are supplied.

## Rollback To Mock

Set `WHATSAPP_PROVIDER=mock`, rotate/revoke temporary credentials where appropriate, and
restart/redeploy. Confirm in-app notifications and all mock operational templates still
work. Disable the staging webhook in the provider account when testing ends.
