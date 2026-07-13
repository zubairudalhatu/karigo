# Task 113 KariGO Activation Email Template Polish

## Purpose

This note documents the polished KariGO account activation email used after successful
OTP verification. It applies only to the Resend account activation path introduced for
controlled Kano pilot access.

This task does not activate marketing email, newsletters, order email, payment email,
utility email, referral email, bulk email, live Paystack, Accelerate.ng utilities, wallet
withdrawals, automatic refunds, live rides, ride dispatch, payouts, Pharmacy marketplace
or provider login.

## Branding

The account activation email now includes:

- KariGO red, black, white and light grey styling.
- A card layout intended to render cleanly in Gmail and mobile inboxes.
- A configurable public HTTPS logo image.
- A branded text fallback when no safe logo URL is configured.
- Controlled early access wording for the Kano pilot.
- Support contact copy.
- A footer that identifies the email as an account activation notification, not marketing.

## Environment Variables

Store values only in the staging/pilot secret manager:

```dotenv
ACCOUNT_ACTIVATION_EMAIL_ENABLED=true
ACCOUNT_ACTIVATION_EMAIL_PROVIDER=resend
KARIGO_EMAIL_LOGO_URL=
KARIGO_PILOT_EMAIL_LABEL=
```

`KARIGO_EMAIL_LOGO_URL` must be a public HTTPS image URL. If blank, the email uses a
KariGO text header fallback. Do not commit logo-hosting credentials, sender-domain
verification details or Resend API keys.

## Recommended Logo Source

The repository contains KariGO logo assets, including:

- `apps/website/public/karigo-logo.png`
- `apps/customer-app/assets/karigo-logo.png`
- `apps/rider-app/assets/karigo-logo.png`

Email clients need a public HTTPS URL, so deployment should point `KARIGO_EMAIL_LOGO_URL`
to the verified hosted website logo once confirmed by operations.

## QA Checks

- Verify account activation email renders with a hosted logo when configured.
- Verify the text fallback renders when no logo URL is configured.
- Verify the footer says this is not a marketing email.
- Verify `EMAIL_PROVIDER=mock` remains selected for generic transactional email.
- Verify Resend remains limited to account activation email only.
