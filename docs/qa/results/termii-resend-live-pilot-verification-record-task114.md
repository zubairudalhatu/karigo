# Task 114 Termii/Resend Live Pilot Verification Record

## Purpose

This is the official verification record for KariGO's controlled pilot authentication
communications before inviting real Kano pilot users.

This record covers only:

- Termii OTP/auth SMS for customer registration, OTP verification and OTP resend.
- Resend account activation email after successful OTP verification.
- KariGO branded account activation email rendering.

This record does not activate live Paystack, Paystack Test Mode as default,
Accelerate.ng utilities, wallet withdrawals, automatic refunds, live rides, ride
dispatch, payouts, Pharmacy marketplace, provider login, marketing SMS, promotional
email, newsletter email, order SMS, payment SMS, utility SMS or referral SMS.

## Current Pilot Configuration

| Area | Pilot state | Verified |
| --- | --- | --- |
| Payment mode | Mock payment | `[ ] Yes / [ ] No` |
| Paystack Test Mode | Inactive unless separately approved | `[ ] Yes / [ ] No` |
| Live Paystack | Disabled | `[ ] Yes / [ ] No` |
| Accelerate.ng utilities | Future integration, not live | `[ ] Yes / [ ] No` |
| Termii | Enabled only for OTP/auth SMS | `[ ] Yes / [ ] No` |
| Resend | Enabled only for account activation email | `[ ] Yes / [ ] No` |
| Generic SMS notifications | Disabled | `[ ] Yes / [ ] No` |
| Marketing SMS/email | Disabled | `[ ] Yes / [ ] No` |
| Wallet withdrawal/refund automation | Disabled | `[ ] Yes / [ ] No` |
| Rides | Disabled/readiness-only | `[ ] Yes / [ ] No` |

## Verification Ownership

| Role | Owner | Date/time | Notes |
| --- | --- | --- | --- |
| Technical lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Operations lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Support lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Management reviewer | `[Name]` | `[DD Month YYYY, HH:MM]` |  |

## Evidence Safety Rules

- Do not record OTP values.
- Do not record full phone numbers.
- Do not record Resend API keys, Termii API keys, sender secrets or sender-domain
  verification details.
- Do not paste provider dashboard screenshots into Git.
- Do not record access tokens, session tokens, password values or private customer data.
- Use masked references only, such as `+23480*****78` or `a***@example.com`.
- Store sensitive provider evidence outside the repository in an approved secure location.

## Environment Verification

Record only variable names and pass/fail status. Do not record values.

| Environment item | Expected state | Result | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Staging/pilot, not production | `Pass / Fail / Blocked` |  |  |
| `OTP_PROVIDER` | `termii` | `Pass / Fail / Blocked` |  |  |
| `SMS_PROVIDER` | `termii` | `Pass / Fail / Blocked` |  |  |
| `TERMII_API_KEY` | Present in secret manager only | `Pass / Fail / Blocked` |  |  |
| `TERMII_SENDER_ID` | Present in secret manager only | `Pass / Fail / Blocked` |  |  |
| `EMAIL_PROVIDER` | `mock` | `Pass / Fail / Blocked` |  |  |
| `ACCOUNT_ACTIVATION_EMAIL_ENABLED` | `true` | `Pass / Fail / Blocked` |  |  |
| `ACCOUNT_ACTIVATION_EMAIL_PROVIDER` | `resend` | `Pass / Fail / Blocked` |  |  |
| `RESEND_API_KEY` | Present in secret manager only | `Pass / Fail / Blocked` |  |  |
| `RESEND_FROM_EMAIL` | Present in secret manager only | `Pass / Fail / Blocked` |  |  |
| `KARIGO_EMAIL_LOGO_URL` | Blank or public HTTPS logo URL | `Pass / Fail / Blocked` |  |  |
| `KARIGO_PILOT_EMAIL_LABEL` | Pilot-safe label | `Pass / Fail / Blocked` |  |  |

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `AUTH-114-001` | Register using approved `080...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-002` | Register using approved `081...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-003` | Register using approved `070...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-004` | Register using approved `090...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-005` | Register using approved `091...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-006` | Register using approved `234...` fixture | Phone normalizes to `+234...`; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-007` | Register using approved `+234...` fixture | Phone remains normalized; OTP sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-008` | Submit invalid phone fixture | API rejects phone number safely |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-009` | Verify received OTP | Account becomes active; session returned |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-010` | Resend OTP before cooldown | Cooldown response shown; no duplicate uncontrolled send |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-011` | Resend OTP after cooldown | Old OTP invalidated; replacement sent by Termii |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-012` | Activation email through Resend | Branded email delivered after successful OTP verification |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-013` | Activation email logo rendering | Hosted logo or text fallback renders cleanly |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-014` | Generic transactional email guardrail | Order/support/payment/referral emails remain disabled |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-015` | Generic SMS guardrail | Order/payment/utility/referral SMS remain disabled |  | `Pass / Fail / Blocked` |  |  |
| `AUTH-114-016` | Mock payment guardrail | Checkout still uses mock payment only |  | `Pass / Fail / Blocked` |  |  |

## Termii OTP Verification Details

| Item | Record |
| --- | --- |
| Test phone reference | `[Masked only]` |
| Normalized format confirmed | `Yes / No / Blocked` |
| OTP returned by API response | `No / Yes - blocker` |
| OTP stored as hash only | `Yes / No / Not inspected` |
| Termii accepted request | `Yes / No / Blocked` |
| Termii evidence stored securely outside Git | `Yes / No / N/A` |
| OTP verification result | `Pass / Fail / Blocked` |
| Resend cooldown result | `Pass / Fail / Blocked` |
| Old OTP invalidation result | `Pass / Fail / Blocked` |

## Resend Activation Email Verification Details

| Item | Record |
| --- | --- |
| Test email reference | `[Masked only]` |
| Email sent only after OTP verification | `Yes / No / Blocked` |
| Email subject | `Your KariGO account is active` |
| Logo rendered | `Hosted logo / Text fallback / Failed` |
| Pilot wording visible | `Yes / No / Blocked` |
| Support contact visible | `Yes / No / Blocked` |
| Not-marketing footer visible | `Yes / No / Blocked` |
| Generic email provider remains mock | `Yes / No / Blocked` |
| Resend evidence stored securely outside Git | `Yes / No / N/A` |

## Negative And Safety Tests

| Test | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- |
| Wrong OTP | Rejected; account remains inactive |  | `Pass / Fail / Blocked` |  |
| Expired OTP | Rejected; resend required |  | `Pass / Fail / Blocked` |  |
| Attempt limit reached | Verification blocked safely |  | `Pass / Fail / Blocked` |  |
| Termii failure | OTP invalidated; account not activated |  | `Pass / Fail / Blocked` |  |
| Resend failure after OTP success | Account remains active; login works |  | `Pass / Fail / Blocked` |  |
| Non-HTTPS email logo URL | Rejected by backend config or not used |  | `Pass / Fail / Blocked` |  |
| Marketing email attempt | Not sent |  | `Pass / Fail / Blocked` |  |
| Non-auth SMS attempt | Not sent |  | `Pass / Fail / Blocked` |  |

## Issues Found

| Issue ID | Severity | Description | Owner | Status | Required before pilot invite |
| --- | --- | --- | --- | --- | --- |
| `AUTH114-001` | `P0/P1/P2/P3` |  |  | `Open / Resolved / Deferred` | `Yes / No` |
| `AUTH114-002` |  |  |  |  |  |

## Final Verification Decision

| Decision item | Record |
| --- | --- |
| Termii OTP/auth SMS verified | `Yes / No / Blocked` |
| Resend account activation email verified | `Yes / No / Blocked` |
| Account activation email branding accepted | `Yes / No / Blocked` |
| No unauthorized SMS/email categories enabled | `Yes / No / Blocked` |
| Safe to invite real Kano pilot users | `Go / Conditional Go / No-Go` |
| Conditions before invite |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Technical lead |  | `Approved / Not approved` |  |  |
| Operations lead |  | `Approved / Not approved` |  |  |
| Support lead |  | `Approved / Not approved` |  |  |
| Management reviewer |  | `Approved / Not approved` |  |  |
