# SMS And OTP Provider Integration Plan

## Current Status

- Mock OTP delivery is the default and remains fully available for local development.
- OTPs are cryptographically generated, stored as bcrypt hashes, expire, and invalidate
  older active codes.
- Verification attempts and resend cooldown are configurable.
- Registration and resend return `mockOtp` only when `OTP_PROVIDER=mock` and the
  application is not running in production mode.
- Termii is prepared behind a credential-gated, non-production adapter.
- Africa's Talking is registered as a placeholder and cannot send messages yet.

## Provider Abstraction

Provider files live under `services/backend-api/src/modules/auth/providers/`.

- `OtpProvider` defines `sendOtp`, `sendMessage`, and optional provider health checks.
- `OtpProviderRegistry` selects `OTP_PROVIDER`.
- `MockOtpProvider` accepts local sends without logging the code.
- `TermiiOtpProvider` prepares a Termii SMS request and returns a normalized result.
- `AfricasTalkingOtpProvider` returns a clear unavailable response until implemented.

## Authentication Flow

1. Normalize supported Nigerian numbers to `+234XXXXXXXXXX`.
2. Register the customer and generate a numeric OTP.
3. Store only the bcrypt hash, expiry, attempts, and timestamps.
4. Send through the active provider.
5. Verify against the latest active code.
6. Increment failed attempts and reject expired/attempt-limited codes.
7. Mark the account active after successful verification.

`POST /api/v1/auth/resend-otp` invalidates the old code, enforces the configured cooldown,
and sends a replacement for eligible unverified accounts.

## Required Variables

```dotenv
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_PROVIDER=mock
SMS_PROVIDER=mock
TERMII_API_KEY=
TERMII_SENDER_ID=KariGO
TERMII_BASE_URL=https://api.ng.termii.com
AFRICAS_TALKING_USERNAME=
AFRICAS_TALKING_API_KEY=
AFRICAS_TALKING_SENDER_ID=KariGO
```

## Security Rules

- Never return or log OTP codes in production.
- Never commit provider credentials.
- Keep `OTP_PROVIDER=mock` until sandbox testing is approved.
- Normalize and validate Nigerian mobile numbers before sending.
- Use expiry, attempt limits, cooldowns, and old-code invalidation.
- Return generic, friendly resend and provider-failure messages.
- Add distributed per-phone, per-IP, and per-device hourly/daily rate limits before
  public customer onboarding.

## Sandbox Verification

1. Obtain approved test credentials and sender ID.
2. Set `APP_ENV=development` and `OTP_PROVIDER=termii`.
3. Configure Termii variables outside source control.
4. Confirm the provider endpoint, route/channel, sender approval, billing behavior, and
   delivery receipts with Termii before sending.
5. Test valid, invalid, expired, attempt-limited, cooldown, timeout, and provider-failure
   flows.
6. Confirm API responses and logs never expose the OTP or API key.

## Production Go-Live Checklist

- [ ] Provider contract and sender ID approved
- [ ] Distributed issue and verification rate limiting enabled
- [ ] Provider delivery status and monitoring enabled
- [ ] Secrets stored in an approved secret manager
- [ ] OTP removed from every production response/log/analytic event
- [ ] Termii production-mode guard replaced by an explicit approval control
- [ ] Failure and fallback policy approved
