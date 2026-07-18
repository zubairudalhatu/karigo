# Task 168 - Vendor Activation Resend Runbook

## Purpose

Use this when an approved Vendor cannot activate its Vendor Dashboard account because the setup link expired, was lost, or was opened after its one-time token was used.

## Admin Resend

1. Sign in to Admin Portal as an authorized Admin.
2. Open `Vendors` or `Vendor Applications`.
3. Locate the approved Vendor account.
4. Choose `Send activation link`.
5. Confirm the page reports the activation link was sent and shows an expiry time.
6. Ask the Vendor to check approved email/SMS channels.

The Admin Portal must not display a raw activation URL. Do not copy activation tokens into chat, tickets, screenshots, or documentation.

## Vendor Self-Service Resend

1. Vendor opens Vendor Dashboard activation page.
2. If the link is invalid or expired, the page shows a request form.
3. Vendor enters the approved phone number or email.
4. Backend returns a generic accepted response.
5. Eligible inactive Vendor accounts receive a new secure password setup link through approved notification channels.

## Backend Guardrails

- Existing pending activation tokens are revoked before a new token is created.
- Tokens are stored as hashes.
- Plaintext tokens are never returned by the API.
- Activation links expire based on the configured TTL, defaulting to a safe multi-day window.
- Activation is single-use.
- Audit/vendor event records are created where supported.

## Troubleshooting

- If no message is delivered, confirm application notification flags and providers in Render.
- Confirm the Vendor account is approved and not already active.
- Confirm the phone/email matches the approved Vendor account.
- Check backend logs only for safe masked notification decision metadata.
