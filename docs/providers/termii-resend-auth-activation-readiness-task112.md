# Task 112 Termii OTP And Resend Account Activation Readiness

## Purpose

This document defines the controlled authentication communication setup for the KariGO
Kano pilot. It covers only:

- Termii OTP SMS for registration and resend verification.
- Resend account activation email after successful OTP verification.

It does not activate live Paystack, Paystack Test Mode as default, Accelerate.ng
utilities, wallet withdrawals, automatic refunds, live rides, ride dispatch, payouts,
Pharmacy marketplace, provider login, marketing SMS, promotional email or broad
transactional email.

## Approved Scope

| Channel | Approved use | Status |
| --- | --- | --- |
| Termii | OTP/auth SMS only | Environment-controlled |
| Resend | Account activation email only | Environment-controlled |
| Generic SMS notifications | Not approved | Disabled |
| Generic transactional email | Not approved | `EMAIL_PROVIDER=mock` |
| Marketing/promotional messages | Not approved | Disabled |

## Required Environment Variables

Store values only in the staging/pilot secret manager. Do not commit credentials,
sender identities, test recipients, OTPs, provider screenshots or logs containing
sensitive data.

```dotenv
APP_ENV=staging

# OTP/auth SMS only
OTP_PROVIDER=termii
SMS_PROVIDER=termii
TERMII_API_KEY=
TERMII_SENDER_ID=
TERMII_BASE_URL=
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

# Account activation email only
EMAIL_PROVIDER=mock
ACCOUNT_ACTIVATION_EMAIL_ENABLED=true
ACCOUNT_ACTIVATION_EMAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_REPLY_TO=
RESEND_BASE_URL=
```

## Guardrails

- Nigerian phone numbers are accepted in familiar local shapes such as `080...`,
  `081...`, `070...`, `090...`, and `091...`, then normalized server-side to
  `+234XXXXXXXXXX`.
- OTP values are generated server-side, hashed before storage, expire after the
  configured window and are never returned in Termii mode.
- Resend email is triggered only after successful account activation.
- Resend failure must not undo successful OTP verification or block the user's account.
- Generic `EMAIL_PROVIDER` remains `mock`, so order, support, marketing and other
  transactional emails remain disabled.
- Termii must not be used for order-status, wallet, utility, marketing or campaign SMS
  in this task.
- Production activation remains blocked until a later approval task.

## Rollback

To return to fully mocked auth communications, update the staging/pilot environment and
redeploy:

```dotenv
OTP_PROVIDER=mock
SMS_PROVIDER=mock
ACCOUNT_ACTIVATION_EMAIL_ENABLED=false
ACCOUNT_ACTIVATION_EMAIL_PROVIDER=mock
EMAIL_PROVIDER=mock
```

After rollback, run registration, resend OTP, verify OTP and login smoke tests.
