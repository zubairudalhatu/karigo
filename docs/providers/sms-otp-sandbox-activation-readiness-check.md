# SMS OTP Sandbox Activation Readiness Check

## Decision Summary

| Item | Current state |
| --- | --- |
| Selected preparation path | Termii sandbox |
| Formal management approval | Not recorded; `MDR-009` remains Open |
| Sandbox account | Required; not evidenced in the repository |
| Sandbox credentials | Required in the staging secret manager; not available to this review |
| Sender ID | Provider-approved staging sender required; approval not evidenced |
| Approved test phone | Required and must be stored outside Git; not evidenced |
| Deployed staging environment | Designed in documentation; deployment evidence not present |
| Backend build | Passing at Task 33 verification |
| Mock fallback | Available and remains the configured default |
| Phone normalization | Implemented for supported Nigerian mobile formats |
| OTP security | Hashed storage, expiry, attempt limit, resend cooldown, and old-code invalidation implemented |

## Required Staging Variables

- `APP_ENV=staging`
- `OTP_PROVIDER=termii`
- `SMS_PROVIDER=termii`
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`
- `TERMII_BASE_URL`
- `OTP_EXPIRY_MINUTES`
- `OTP_LENGTH`
- `OTP_MAX_ATTEMPTS`
- `OTP_RESEND_COOLDOWN_SECONDS`

Store secret and provider-controlled values only in the staging platform secret manager.
Do not place credentials, sender details, test phone numbers, or OTPs in Git, tickets,
screenshots, normal logs, analytics, or test evidence.

## Guardrail Readiness

- [x] Mock is the default when no OTP provider is selected.
- [x] Explicit Termii selection fails startup when required credentials are absent.
- [x] Termii is blocked in `APP_ENV=production` pending a separate live approval.
- [x] OTPs are generated server-side and stored as bcrypt hashes.
- [x] Failed provider delivery invalidates the newly generated OTP.
- [x] Registration and resend omit OTP values in staging/Termii mode.
- [x] Verification expiry, failed-attempt limit, resend cooldown, and replacement invalidation exist.
- [ ] Distributed per-phone and per-IP issue/resend rate limiting is production-ready.
- [ ] Approved Termii sandbox account, sender ID, and test phone are available.
- [ ] Deployed staging and provider delivery testing are complete.

## Approval Owner

Security, Operations, and Engineering must jointly approve the sandbox assessment.
Management decision owner: record against `MDR-009`.

## Activation Decision

- [ ] Ready for sandbox activation
- [x] Waiting for credentials
- [x] Waiting for sender ID approval
- [ ] Blocked by technical issue
- [x] Blocked by management approval

Do not change `OTP_PROVIDER` or `SMS_PROVIDER` from `mock` until every applicable gate is
recorded in the activation decision log.
