# Termii Sandbox Preparation Notes

## Status

KariGO includes a non-production Termii preparation adapter. It is not approved for live
SMS traffic and is blocked when `APP_ENV=production`.

Task 33 leaves Termii unactivated. The local backend resolves to mock OTP, no Termii
credential or sender is configured, and management record `MDR-009` remains open.
Staging execution must wait for formal approval, an approved sender/test account,
credentials in the staging secret manager, and a separately deployed staging environment.

Activation and evidence records are in
`sms-otp-sandbox-activation-readiness-check.md`,
`staging-sms-otp-provider-configuration.md`,
`sms-otp-sandbox-activation-decision-log.md`, and the corresponding `docs/qa/` scripts.

## Configuration

```dotenv
APP_ENV=development
OTP_PROVIDER=termii
TERMII_API_KEY=
TERMII_SENDER_ID=KariGO
TERMII_BASE_URL=https://api.ng.termii.com
```

Use only approved test credentials stored outside the repository. Never commit a real
Termii API key.

## Safe Test Procedure

1. Confirm the test account, approved sender ID, correct SMS endpoint, route/channel, and
   billing behavior with Termii.
2. Configure credentials in a local untracked `.env`.
3. Register an approved test phone number.
4. Verify delivery, expiry, invalid code, maximum attempts, and resend cooldown.
5. Inspect responses and logs to confirm neither the OTP nor API key is exposed.
6. Return `OTP_PROVIDER=mock` after testing.

## Known TODOs

- Confirm provider-specific sandbox/test behavior and approved Nigerian sender ID.
- Confirm whether Termii's token-based OTP product should replace the prepared generic
  SMS delivery request.
- Add delivery-status callbacks and operational telemetry.
- Add distributed per-phone/per-IP issue limits.
- Add an explicit production approval flag before removing the production guard.
