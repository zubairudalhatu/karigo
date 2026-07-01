# Email Sandbox Activation Readiness Check

## Decision Summary

| Item | Current state |
| --- | --- |
| Selected provider | Not formally selected; SMTP sandbox/test inbox or SendGrid assessment proposed |
| Management approval | Not recorded; `MDR-013` is Open |
| Sandbox/test account | Required; not evidenced in the repository |
| Sender email | Approved staging identity required; not recorded here |
| Sender domain verification | Required before provider testing; not evidenced |
| Test recipient | Approved masked test inbox required; not evidenced |
| Template readiness | All catalogue templates render in mock tests; event wiring varies by template |
| Backend build | Passing at Task 34 verification |
| Mock fallback | Ready and remains the only permitted provider |
| Deployed staging | Designed in documentation; deployment evidence not present |

## Required Staging Variables

Common:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`

SMTP sandbox/test inbox:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`

SendGrid assessment:

- `SENDGRID_API_KEY`

All credentials, sender identities, domain records, and test recipients belong in the
staging secret manager or an approved evidence system, never Git.

## Guardrail Readiness

- [x] Mock email is selected by default.
- [x] Non-mock providers are blocked by environment validation.
- [x] Placeholder providers fail closed and cannot send.
- [x] Mock logs mask recipients and omit bodies, credentials, and metadata.
- [x] External-channel failures are caught and do not fail core workflows.
- [x] Required template variables fail in a controlled manner.
- [x] HTML variables are escaped and plaintext fallback exists.
- [x] Templates use a neutral support-contact fallback rather than an unapproved domain.
- [ ] A management-approved provider and sandbox adapter exist.
- [ ] Sender identity/domain verification is approved.
- [ ] Queue/retry, suppression, bounce, complaint, and delivery telemetry are implemented.
- [ ] Event-level email deduplication is implemented beyond upstream business idempotency.

## Approval Owner

Operations/Support, Security, and Engineering must approve sandbox assessment. Record the
management selection and conditions against `MDR-013`.

## Activation Decision

- [ ] Ready for sandbox activation
- [x] Waiting for credentials
- [x] Waiting for sender verification
- [x] Waiting for domain verification
- [x] Blocked by technical issue
- [x] Blocked by management approval

Do not change `EMAIL_PROVIDER=mock` until a selected sandbox adapter, staging, sender
verification, credentials, and rollback test have all been approved.
