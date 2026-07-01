# WhatsApp Sandbox Activation Readiness Check

## Decision Summary

| Item | Current state |
| --- | --- |
| Selected preparation path | Meta WhatsApp Cloud API sandbox/test assessment |
| Formal management approval | Not recorded; `MDR-015` is Open |
| Sandbox/test account | Required; not evidenced in the repository |
| Required credentials | Access token, phone-number ID, business-account ID, webhook verify token, app secret |
| WhatsApp business account | Required; readiness not evidenced |
| Approved test recipients | Required with operational opt-in; not evidenced |
| Template approval | All operational templates remain draft/needs approval |
| Backend build | Passing at Task 36 verification |
| Mock fallback | Ready and remains the configured provider |
| Webhook readiness | Interface exists; public route, signature verification, idempotency, and persistence are not implemented |
| Deployed staging | Designed in documentation; deployment evidence not present |

## Required Staging Variables

- `WHATSAPP_PROVIDER=meta_cloud`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_BASE_URL`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_SANDBOX_MODE=true`

The code's canonical provider name is `meta_cloud`; do not use an undocumented alias.
Store all values in the staging secret manager. Recipient numbers, consent records,
provider references, and message metadata are sensitive operational data.

## Guardrail Readiness

- [x] Mock is the default and non-mock selection fails startup.
- [x] Meta sending and webhook handlers are hard-disabled placeholders.
- [x] WhatsApp sends are template-only; unrestricted text is rejected.
- [x] Unsupported/marketing notification types cannot use a generic fallback.
- [x] Customer/vendor/rider operational variants are selected by event and role.
- [x] Mock logs mask recipients and omit variables/metadata.
- [x] Notification orchestration catches provider failures.
- [x] Existing workflows remain in-app-first.
- [ ] Auditable recipient opt-in, opt-out, and suppression controls exist.
- [ ] Meta templates are approved for sandbox use.
- [ ] Meta send adapter, webhook route/signature verification, callback idempotency, and telemetry exist.
- [ ] Dedicated outbound event deduplication/frequency controls exist.

## Approval Owner

Operations, Legal/Privacy, Security, and Engineering must approve the assessment. Record
provider, test recipients, consent basis, templates, and accountable owners in `MDR-015`.

## Activation Decision

- [ ] Ready for sandbox activation
- [x] Waiting for credentials
- [x] Waiting for approved templates
- [x] Waiting for test recipients
- [x] Waiting for webhook configuration
- [x] Blocked by technical issue
- [x] Blocked by management approval

Do not change `WHATSAPP_PROVIDER=mock` until every applicable gate is closed.
