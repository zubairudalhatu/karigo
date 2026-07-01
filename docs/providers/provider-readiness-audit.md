# Provider Readiness Audit

## Current Operating Mode

KariGO currently runs with `PAYMENT_PROVIDER=mock`, `OTP_PROVIDER=mock`, `SMS_PROVIDER=mock`, and
`NOTIFICATION_PROVIDER=mock`. In-app notifications are persisted. External messages and
real financial transactions are not sent.

## Payment

| Provider | Existing implementation | Production work required |
| --- | --- | --- |
| Mock | Complete initiation, verification, webhook simulation, idempotency tests, refund workflow | Keep restricted to development/test |
| Paystack | Sandbox initiation, verification, test-key validation, amount/currency checks and signed webhook parsing implemented | Approved test-account E2E checkout, frontend redirect flow, refunds, reconciliation, monitoring and live-mode controls |
| Flutterwave | Registered placeholder class | API client, credential validation, verification, signed webhooks, refunds |
| Monnify | Registered placeholder class | API client, contract-code support, verification, signed webhooks, refunds |
| Squad | Registered placeholder class | API client, credential validation, verification, signed webhooks, refunds |

Existing files are under `services/backend-api/src/modules/payments/providers/`. The
`PaymentProvider` interface covers initiation, verification, and webhook parsing. The
registry selects the active provider with `PAYMENT_PROVIDER`.

Security requirements: never trust frontend success or amount; verify transactions
server-side; verify webhook signatures against the raw request body; enforce idempotency;
store provider references; redact secrets and sensitive provider payloads from logs.

Testing requirements: provider contract tests, sandbox integration tests, duplicate
verification/webhook tests, amount mismatch tests, invalid signature tests, timeout/retry
tests, and refund reconciliation tests.

## SMS And OTP

OTP generation, bcrypt hashing, expiry, configurable attempt limits, resend cooldown,
old-code invalidation, and Nigerian phone normalization exist under `modules/auth`.
Development registration/resend may return `mockOtp` only when `OTP_PROVIDER=mock` and
`APP_ENV` is not production.

A dedicated OTP provider interface and registry now select mock, Termii, or Africa's
Talking. Mock is complete. Termii has a non-production, credential-gated SMS preparation
adapter and must be confirmed against an approved Termii test account before use.
Africa's Talking remains a deliberate placeholder.

Production still requires distributed per-phone/per-IP rate limiting, provider delivery
status handling, approved sender IDs, monitoring, and removal of the current Termii
production-mode guard after formal go-live approval.

Security requirements: never return or log OTPs in production; limit issuing and
verification attempts; use short expiry; prevent account enumeration; redact phone
numbers where practical.

## Email

A dedicated email provider registry, mock provider, branded transactional template
catalogue, and EMAIL-channel notification bridge now exist under
`modules/notifications/email`. SMTP, SendGrid, Mailgun, and Amazon SES remain deliberate
hard placeholders. Environment validation keeps `EMAIL_PROVIDER=mock`.

Production requires one approved provider adapter, verified sender/domain, queueing,
delivery/failure telemetry, bounce/complaint handling, unsubscribe/consent handling where
applicable, and managed secrets.

## WhatsApp

A dedicated WhatsApp provider registry, mock provider, Meta Cloud hard placeholder,
operational template catalogue, and explicit-channel notification bridge now exist under
`modules/notifications/whatsapp`. Environment validation keeps `WHATSAPP_PROVIDER=mock`.
No real message sending or webhook processing is enabled.

Production requires explicit opt-in storage, approved operational templates,
access-token rotation, webhook signature verification, delivery-status handling,
opt-out/suppression, frequency controls, and strict controls against unsolicited
marketing messages.

## Push

A dedicated push provider registry, mock provider, Expo/Firebase hard placeholders,
operational template catalogue, and explicit-channel notification bridge now exist under
`modules/notifications/push`. Device-token storage and authenticated registration,
listing, and deactivation endpoints are implemented. Raw tokens are not returned by the
API. Environment validation keeps `PUSH_PROVIDER=mock`.

Production still requires mobile permission UX, Expo/FCM sandbox delivery, token refresh
and logout cleanup, invalid-token receipt processing, deep-link review, preferences,
monitoring, and managed secrets.

## Environment And Deployment Readiness

- Backend environment validation currently permits payment provider selection but only
  permits `NOTIFICATION_PROVIDER=mock`.
- Provider-specific credentials are placeholders in `.env.example`; real secrets must be
  stored in a managed secret store.
- Task 18 deployment and soft-launch documents exist under `docs/deployment/` and
  `docs/launch/`.
- The production TODO register exists at
  `docs/deployment/production-todo-register.md`.

## Recommendation

Integrate Paystack sandbox first. It fits the existing payment abstraction and lets the
team validate the highest-risk transaction, webhook, refund, and reconciliation controls
before enabling live payments. Keep all other providers mocked until that integration is
stable.
