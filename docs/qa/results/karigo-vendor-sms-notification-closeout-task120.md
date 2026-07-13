# Task 120 Vendor SMS Notification Fix And Live Verification Closeout

## Purpose

This record closes the remaining vendor application SMS notification gap before the
Kano controlled pilot.

Recent pilot notification tests confirmed:

- Vendor application email works.
- Delivery Captain application email works.
- Delivery Captain SMS works on Glo.
- Delivery Captain guarantor SMS works on Glo.
- Ride Captain readiness application email works.
- Ride Captain readiness application SMS works on Glo.
- Order-created email works.
- Order-created SMS can be accepted by Termii, with MTN delivery still subject to
  carrier, DND and routing behaviour.

The open issue was that vendor application SMS was not received and no Termii
dashboard record was found for the vendor SMS attempt.

## Scope Guardrails

This task does not activate live Paystack, Paystack Test Mode as default,
Accelerate.ng utilities, wallet withdrawals, automatic refunds, live rides, ride
dispatch, payouts, Pharmacy marketplace, provider login, marketing SMS, promotional
email, newsletter email, bulk SMS, bulk email, utility SMS/email or referral reward
SMS/email.

Termii remains approved only for OTP/auth SMS and approved controlled transactional
notifications. Resend remains approved only for account activation, application and
approved transactional emails.

## Fix Summary

Vendor application phone fields are now normalized and validated server-side before:

- vendor application persistence;
- vendor application SMS/email notification routing;
- safe notification decision logging.

Accepted public input formats include familiar Nigerian local and international
formats such as:

- `080...`
- `070...`
- `081...`
- `090...`
- `091...`
- `234...`
- `+234...`

Stored and notification-routed values must be normalized to `+234...`.

## Expected Backend Log

After backend redeploy and a new public vendor application submission with notification
flags enabled, Render logs should include safe metadata similar to:

```text
Application notification decision type=vendor_application_received smsEnabled=true emailEnabled=true hasPhone=true hasEmail=true smsProvider=termii emailProvider=resend result=sent reason=provider_accepted
```

If Termii rejects the SMS, the decision should show `result=failed` with a safe
provider-error reason, and the Termii diagnostic log must mask the recipient.

## Environment Flags To Verify

Record only pass/fail status. Do not record values.

| Flag | Approved use | Status | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| `APPLICATION_SMS_NOTIFICATIONS_ENABLED` | Vendor and Delivery Captain application SMS | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_EMAIL_NOTIFICATIONS_ENABLED` | Vendor and Delivery Captain application email | `Pass / Fail / Blocked` |  |  |
| `TRANSACTIONAL_SMS_NOTIFICATION_PROVIDER` | `termii` or `mock` | `Pass / Fail / Blocked` |  |  |
| `TRANSACTIONAL_EMAIL_NOTIFICATION_PROVIDER` | `resend` or `mock` | `Pass / Fail / Blocked` |  |  |
| `TERMII_API_KEY` | Secret manager only | `Pass / Fail / Blocked` |  | Do not record value |
| `TERMII_SENDER_ID` | Secret manager only | `Pass / Fail / Blocked` |  | Do not record value |
| `RESEND_API_KEY` | Secret manager only | `Pass / Fail / Blocked` |  | Do not record value |
| `RESEND_FROM_EMAIL` | Secret manager only | `Pass / Fail / Blocked` |  | Do not record value |

## Vendor SMS Retest Steps

Use only approved masked test contacts. Store provider screenshots outside Git.

| Test ID | Step | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `NOTIF120-001` | Submit vendor application using `080...` style test contact phone | Backend stores/routs normalized `+234...`; vendor application succeeds |  | `Pass / Fail / Blocked` |  |
| `NOTIF120-002` | Confirm Render decision log for `vendor_application_received` | `smsEnabled=true`, `hasPhone=true`, `smsProvider=termii`, `result=sent` or safe `failed` |  | `Pass / Fail / Blocked` |  |
| `NOTIF120-003` | Confirm Termii dashboard/provider evidence | Vendor SMS request appears with masked recipient evidence stored outside Git |  | `Pass / Fail / Blocked` |  |
| `NOTIF120-004` | Confirm vendor email still works | Resend accepts vendor application email |  | `Pass / Fail / Blocked` |  |
| `NOTIF120-005` | Submit invalid vendor phone number | Backend rejects safely; no Termii request is attempted |  | `Pass / Fail / Blocked` |  |
| `NOTIF120-006` | Turn SMS provider back to mock/disabled for rollback test | Vendor application still submits; no Termii request is attempted |  | `Pass / Fail / Blocked` |  |

## Network Notes

| Network | Vendor SMS result | Provider result | Notes |
| --- | --- | --- | --- |
| Glo | `Pass / Fail / Blocked` |  | Previously confirmed working for Captain SMS |
| MTN | `Pass / Fail / Blocked` |  | Delivery may be affected by DND, late-hour routing or carrier filtering |
| Airtel | `Pass / Fail / Blocked` |  |  |
| 9mobile | `Pass / Fail / Blocked` |  |  |

## Evidence Safety

Do not commit:

- full phone numbers;
- OTPs;
- API keys;
- sender IDs if treated as sensitive by operations;
- provider dashboard screenshots;
- .env files;
- private customer, vendor or Captain data.

Provider evidence should be stored in the approved secure operations location outside
the repository with masked references in this document.

## Closeout Decision

| Decision item | Record |
| --- | --- |
| Vendor SMS trigger fixed in backend | `Yes` |
| Backend redeploy completed | `Yes / No` |
| Vendor SMS live retest completed | `Yes / No / Blocked` |
| Termii evidence captured securely | `Yes / No / Blocked` |
| Vendor email still verified | `Yes / No / Blocked` |
| No unauthorized notification categories enabled | `Yes / No / Blocked` |
| Safe for Kano pilot application notifications | `Go / Conditional Go / No-Go` |
| Conditions before pilot |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
