# Task 119 Transactional Notification Coverage And Delivery Diagnostics

## Purpose

This record verifies controlled transactional notification coverage before the Kano pilot.

Covered notification categories:

- Vendor application confirmation.
- Delivery Captain application confirmation.
- Delivery Captain guarantor SMS.
- Ride Captain readiness application confirmation.
- Ride waitlist confirmation.
- Customer order-created confirmation.

This record does not approve or activate live Paystack, Paystack Test Mode as default,
Accelerate.ng utilities, wallet withdrawals, automatic refunds, live rides, ride dispatch,
payouts, Pharmacy marketplace, provider login, marketing SMS, promotional email,
newsletter email, bulk SMS, bulk email, utility SMS/email or referral reward SMS/email.

## Current Pilot Configuration

| Area | Pilot state | Verified |
| --- | --- | --- |
| Payment mode | Mock payment | `[ ] Yes / [ ] No` |
| Paystack Test Mode | Inactive unless separately approved | `[ ] Yes / [ ] No` |
| Live Paystack | Disabled | `[ ] Yes / [ ] No` |
| Accelerate.ng utilities | Future integration, not live | `[ ] Yes / [ ] No` |
| Termii | OTP/auth and approved transactional notifications only | `[ ] Yes / [ ] No` |
| Resend | Account/application/order transactional email only | `[ ] Yes / [ ] No` |
| Marketing SMS/email | Disabled | `[ ] Yes / [ ] No` |
| Bulk SMS/email | Disabled | `[ ] Yes / [ ] No` |
| Rides | Disabled/readiness-only | `[ ] Yes / [ ] No` |
| Ride dispatch | Disabled | `[ ] Yes / [ ] No` |
| Payout automation | Disabled | `[ ] Yes / [ ] No` |

## Environment Flags

Record only variable names and pass/fail status. Do not record values.

| Flag | Approved use | Result | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| `APPLICATION_EMAIL_NOTIFICATIONS_ENABLED` | Vendor and Delivery Captain application emails | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_SMS_NOTIFICATIONS_ENABLED` | Vendor and Delivery Captain application SMS | `Pass / Fail / Blocked` |  |  |
| `GUARANTOR_SMS_NOTIFICATIONS_ENABLED` | Delivery Captain guarantor SMS | `Pass / Fail / Blocked` |  |  |
| `RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED` | Ride Captain readiness application email | `Pass / Fail / Blocked` |  |  |
| `RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED` | Ride Captain readiness application SMS | `Pass / Fail / Blocked` |  |  |
| `RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED` | Ride waitlist email | `Pass / Fail / Blocked` |  |  |
| `RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED` | Ride waitlist SMS | `Pass / Fail / Blocked` |  |  |
| `ORDER_EMAIL_NOTIFICATIONS_ENABLED` | Customer order-created email | `Pass / Fail / Blocked` |  |  |
| `ORDER_SMS_NOTIFICATIONS_ENABLED` | Customer order-created SMS | `Pass / Fail / Blocked` |  |  |
| `TRANSACTIONAL_EMAIL_NOTIFICATION_PROVIDER` | `resend` or `mock` | `Pass / Fail / Blocked` |  | Defaults to `resend` when an email flag is enabled |
| `TRANSACTIONAL_SMS_NOTIFICATION_PROVIDER` | `termii` or `mock` | `Pass / Fail / Blocked` |  | Defaults to `termii` when an SMS flag is enabled |
| `RESEND_API_KEY` | Stored in secret manager only | `Pass / Fail / Blocked` |  |  |
| `RESEND_FROM_EMAIL` | Stored in secret manager only | `Pass / Fail / Blocked` |  |  |
| `TERMII_API_KEY` | Stored in secret manager only | `Pass / Fail / Blocked` |  |  |
| `TERMII_SENDER_ID` | Stored in secret manager only | `Pass / Fail / Blocked` |  |  |

## Delivery Diagnostics

Backend logs should include safe decision metadata for every considered transactional
notification:

```text
Application notification decision type=<notification_type> smsEnabled=true/false emailEnabled=true/false hasPhone=true/false hasEmail=true/false smsProvider=termii/mock/disabled emailProvider=resend/mock/disabled result=sent/skipped/failed reason=<safe_reason>
```

Termii diagnostics may include:

- Masked recipient only, for example `+234***123`.
- HTTP status.
- Provider reference where returned.
- Sanitized provider message.

Termii diagnostics must not include:

- Full phone numbers.
- OTPs.
- API keys.
- Sender secrets.
- Full provider dashboard screenshots in Git.

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `NOTIF119-001` | Vendor application submitted | Resend and/or Termii attempted when enabled; decision log recorded |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-002` | Delivery Captain application submitted | Applicant email/SMS attempted when enabled; guarantor SMS separately controlled |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-003` | Delivery Captain guarantor SMS | Guarantor notice sent only when `GUARANTOR_SMS_NOTIFICATIONS_ENABLED=true` |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-004` | Ride Captain readiness application submitted | Readiness-only email/SMS attempted when Ride application flags are enabled |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-005` | Ride waitlist submitted | Waitlist email/SMS attempted when waitlist flags are enabled |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-006` | Vendor/customer order created | Customer order-created email/SMS attempted when order flags are enabled |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-007` | Parcel order created | Customer order-created email/SMS attempted when order flags are enabled |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-008` | Termii rejects or delays SMS | Safe diagnostic log shows failed decision and sanitized provider message |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-009` | Resend rejects email | Safe diagnostic log shows failed decision and sanitized provider message |  | `Pass / Fail / Blocked` |  |  |
| `NOTIF119-010` | Notification flags disabled | Core application/order flow still succeeds; send is skipped |  | `Pass / Fail / Blocked` |  |  |

## Network-Specific SMS Checks

| Network | Test phone reference | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| MTN | `[Masked only]` | Application/order SMS | Termii accepts request or returns safe failure detail |  | `Pass / Fail / Blocked` |  |
| Glo | `[Masked only]` | Application/order SMS | Termii accepts request and delivery is observed |  | `Pass / Fail / Blocked` |  |
| Airtel | `[Masked only]` | Application/order SMS | Termii accepts request or returns safe failure detail |  | `Pass / Fail / Blocked` |  |
| 9mobile | `[Masked only]` | Application/order SMS | Termii accepts request or returns safe failure detail |  | `Pass / Fail / Blocked` |  |

## Evidence Safety Rules

- Do not record full phone numbers.
- Do not record full email addresses.
- Do not record OTPs, passwords, access tokens, provider API keys or webhook secrets.
- Do not paste provider dashboard screenshots containing sensitive data into Git.
- Store provider evidence in an approved secure location outside the repository.

## Rollback

To disable controlled transactional notifications without changing core product flows:

```dotenv
APPLICATION_EMAIL_NOTIFICATIONS_ENABLED=false
APPLICATION_SMS_NOTIFICATIONS_ENABLED=false
GUARANTOR_SMS_NOTIFICATIONS_ENABLED=false
RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED=false
RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED=false
RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED=false
RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED=false
ORDER_EMAIL_NOTIFICATIONS_ENABLED=false
ORDER_SMS_NOTIFICATIONS_ENABLED=false
TRANSACTIONAL_EMAIL_NOTIFICATION_PROVIDER=mock
TRANSACTIONAL_SMS_NOTIFICATION_PROVIDER=mock
```

After rollback, verify:

- Vendor applications still submit.
- Delivery Captain applications still submit.
- Ride readiness applications and waitlist records still submit.
- Orders still create and in-app notifications still appear.
- No Resend/Termii transactional send is attempted.

## Final Verification Decision

| Decision item | Record |
| --- | --- |
| Application notification coverage verified | `Yes / No / Blocked` |
| Ride readiness notification coverage verified | `Yes / No / Blocked` |
| Order-created notification coverage verified | `Yes / No / Blocked` |
| Termii diagnostics accepted | `Yes / No / Blocked` |
| No unauthorized marketing/bulk categories enabled | `Yes / No / Blocked` |
| Safe for Kano pilot transactional notifications | `Go / Conditional Go / No-Go` |
| Conditions before pilot |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
