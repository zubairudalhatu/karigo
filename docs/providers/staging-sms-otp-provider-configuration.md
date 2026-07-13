# Staging SMS OTP Provider Configuration

This file is a configuration template, not an environment file. Keep committed values
blank. Supply approved values through the staging platform secret manager only.

For Task 112, Termii is approved only for authentication OTP SMS used by registration,
verification and resend flows. Do not use Termii for marketing SMS, order-status SMS,
wallet alerts, utility alerts, ride alerts or broad notifications unless a later task
separately approves that scope.

```dotenv
OTP_PROVIDER=termii
SMS_PROVIDER=termii
TERMII_API_KEY=
TERMII_SENDER_ID=
TERMII_BASE_URL=
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
```

`TERMII_SENDER_ID` must contain the provider-approved staging sender at deployment time.
Do not copy it into source, documentation, screenshots, issue trackers, or test evidence.
`TERMII_BASE_URL` must be the approved HTTPS sandbox/test endpoint confirmed with the
provider; do not guess or silently replace it during activation.

## Secret Storage

Store `TERMII_API_KEY` and any provider-controlled values in the hosting platform's
encrypted staging secret manager. Limit read/write access to authorised Engineering and
Security owners. Use separate development, staging, and future production credentials.

## Activation Procedure

1. Record management and Security/Operations/Engineering approval.
2. Provision a separate staging API and staging database.
3. Add approved variables in the staging secret manager.
4. Confirm no value is printed by deployment logs or configuration diagnostics.
5. Restart or redeploy the backend; provider selection is read at startup.
6. Run the SMS OTP sandbox script with an approved, masked test phone.
7. Record evidence without OTPs, secrets, sender details, or full phone numbers.

Explicit Termii selection is fail-closed: missing credentials prevent startup rather than
silently sending through mock. This avoids false delivery claims.

## Rollback To Mock

Set these staging variables and restart or redeploy the backend:

```dotenv
OTP_PROVIDER=mock
SMS_PROVIDER=mock
```

After rollback, run registration, resend, verification, and login smoke tests. Mock OTP
may be returned only outside production and only while the selected provider is `mock`.
