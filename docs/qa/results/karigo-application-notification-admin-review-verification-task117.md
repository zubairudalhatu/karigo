# Task 117 Application Notification And Admin Review Verification Record

## Purpose

This is the official post-deployment verification record for KariGO application
notifications and Admin Delivery Captain application review before inviting real Kano
pilot participants.

This record covers only:

- Admin Portal review of Delivery Captain applications.
- Backend Admin Delivery Captain application review endpoints.
- Vendor application SMS/email confirmation.
- Delivery Captain application SMS/email confirmation.
- Delivery Captain guarantor SMS notification.
- Public website application anchors for Delivery Captain and Ride Captain readiness.

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
| Termii | Enabled only for OTP/auth SMS and approved application notifications | `[ ] Yes / [ ] No` |
| Resend | Enabled only for account activation and approved application notification emails | `[ ] Yes / [ ] No` |
| Marketing SMS/email | Disabled | `[ ] Yes / [ ] No` |
| Wallet withdrawal/refund automation | Disabled | `[ ] Yes / [ ] No` |
| Rides | Disabled/readiness-only | `[ ] Yes / [ ] No` |
| Ride dispatch | Disabled | `[ ] Yes / [ ] No` |
| Payout automation | Disabled | `[ ] Yes / [ ] No` |

## Verification Ownership

| Role | Owner | Date/time | Notes |
| --- | --- | --- | --- |
| Technical lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Operations lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Support lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Management reviewer | `[Name]` | `[DD Month YYYY, HH:MM]` |  |

## Evidence Safety Rules

- Do not record full phone numbers.
- Do not record full email addresses.
- Do not record Resend API keys, Termii API keys, sender IDs, provider dashboard
  screenshots, webhook secrets or environment variable values.
- Do not record OTP values, access tokens, session tokens, passwords, payment details or
  payout details.
- Do not paste provider dashboard screenshots into Git.
- Use masked references only, such as `+23480*****78` or `a***@example.com`.
- Store sensitive provider evidence outside the repository in an approved secure
  location.

## Environment Verification

Record only variable names and pass/fail status. Do not record values.

| Environment item | Expected state | Result | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Staging/pilot, not production | `Pass / Fail / Blocked` |  |  |
| `PAYMENTS_PROVIDER` / payment mode | Mock payment | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_EMAIL_NOTIFICATIONS_ENABLED` | `true` only for approved application email verification | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_EMAIL_NOTIFICATION_PROVIDER` | `resend` for approved pilot verification or `mock` for rollback; defaults to `resend` when email flag is enabled | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_SMS_NOTIFICATIONS_ENABLED` | `true` only for approved application SMS verification | `Pass / Fail / Blocked` |  |  |
| `APPLICATION_SMS_NOTIFICATION_PROVIDER` | `termii` for approved pilot verification or `mock` for rollback; defaults to `termii` when SMS flag is enabled | `Pass / Fail / Blocked` |  |  |
| `GUARANTOR_SMS_NOTIFICATIONS_ENABLED` | `true` only for approved Delivery Captain guarantor SMS verification | `Pass / Fail / Blocked` |  |  |
| Legacy aliases | `APPLICATION_NOTIFICATION_EMAIL_ENABLED`, `APPLICATION_NOTIFICATION_SMS_ENABLED`, `APPLICATION_NOTIFICATION_EMAIL_PROVIDER`, `APPLICATION_NOTIFICATION_SMS_PROVIDER` remain backward-compatible | `Pass / Fail / Blocked` |  |  |
| `RESEND_API_KEY` | Present in secret manager only when email verification is approved | `Pass / Fail / Blocked` |  |  |
| `RESEND_FROM_EMAIL` | Present in secret manager only when email verification is approved | `Pass / Fail / Blocked` |  |  |
| `TERMII_API_KEY` | Present in secret manager only when SMS verification is approved | `Pass / Fail / Blocked` |  |  |
| `TERMII_SENDER_ID` | Present in secret manager only when SMS verification is approved | `Pass / Fail / Blocked` |  |  |
| Generic marketing SMS/email flags | Disabled | `Pass / Fail / Blocked` |  |  |

## Deployment Verification

| Item | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- |
| Backend deployed after Task 116 | Admin endpoints and notification flags available |  | `Pass / Fail / Blocked` |  |
| Admin Portal deployed after Task 116 | Delivery Captain Applications page available |  | `Pass / Fail / Blocked` |  |
| Website deployed after Task 116 | New public anchors available |  | `Pass / Fail / Blocked` |  |
| Swagger/API docs, if enabled | Delivery Captain application tags visible |  | `Pass / Fail / Blocked` |  |
| Health endpoint | Backend health responds normally |  | `Pass / Fail / Blocked` |  |

## Admin Delivery Captain Review Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `APP117-ADMIN-001` | Admin opens Delivery Captain Applications page | Page loads from Admin Portal sidebar |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-002` | Admin lists Delivery Captain applications | Only authenticated Admin users can list applications |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-003` | Non-admin attempts to access list endpoint | Request is rejected with an authorization error |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-004` | Admin filters by status | Only matching application statuses are returned |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-005` | Admin reviews one application | Status update is saved with internal/admin notes as entered |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-006` | Admin enters applicant-visible review note | Applicant-visible note is saved without exposing secrets |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-007` | Admin approves or provisionally approves application | No Captain login, dispatch access, payout or Ride access is created |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-008` | Admin rejects application | Application status updates safely; no automated marketing message is sent |  | `Pass / Fail / Blocked` |  |  |
| `APP117-ADMIN-009` | Admin checks guarantor information | Guarantor details are visible only in Admin review context |  | `Pass / Fail / Blocked` |  |  |

## Vendor Application Notification Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `APP117-VENDOR-001` | Submit valid Kano vendor application | Application is accepted and reference is returned |  | `Pass / Fail / Blocked` |  |  |
| `APP117-VENDOR-002` | Vendor confirmation email enabled | Resend receives only application confirmation email |  | `Pass / Fail / Blocked` |  |  |
| `APP117-VENDOR-003` | Vendor confirmation SMS enabled | Termii receives only application confirmation SMS |  | `Pass / Fail / Blocked` |  |  |
| `APP117-VENDOR-004` | Application notifications disabled | Application still submits; no provider send occurs |  | `Pass / Fail / Blocked` |  |  |
| `APP117-VENDOR-005` | Provider failure during notification | Application remains submitted; failure is safely logged with masked recipient data |  | `Pass / Fail / Blocked` |  |  |
| `APP117-VENDOR-006` | Non-Kano vendor application attempt | Application is rejected according to Kano-only pilot rule |  | `Pass / Fail / Blocked` |  |  |

## Delivery Captain Application Notification Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `APP117-CAPTAIN-001` | Submit valid Delivery Captain application | Application is accepted and reference is returned |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-002` | Applicant confirmation email enabled | Resend receives only Delivery Captain application confirmation email |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-003` | Applicant confirmation SMS enabled | Termii receives only Delivery Captain application confirmation SMS |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-004` | Guarantor SMS enabled | Termii sends guarantor notice to masked guarantor number |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-005` | Guarantor notice content check | Message states guarantor was listed and warns not to share OTP/payment details |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-006` | Application notifications disabled | Application still submits; no provider send occurs |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-007` | Provider failure during applicant notification | Application remains submitted; failure is safely logged with masked recipient data |  | `Pass / Fail / Blocked` |  |  |
| `APP117-CAPTAIN-008` | Provider failure during guarantor notification | Application remains submitted; failure is safely logged with masked recipient data |  | `Pass / Fail / Blocked` |  |  |

## Observability Verification

Backend logs should include one safe decision line whenever an application notification is
considered. The log must not contain OTPs, secrets, full phone numbers or full email
addresses.

Expected log shape:

```text
Application notification decision type=<notification_type> smsEnabled=true/false emailEnabled=true/false hasPhone=true/false hasEmail=true/false smsProvider=termii/mock/disabled emailProvider=resend/mock/disabled result=sent/skipped/failed reason=<safe_reason>
```

| Test ID | Notification type | Expected decision log | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `APP117-OBS-001` | `vendor_application_received` | Log shows enabled/disabled channel decisions and provider result |  | `Pass / Fail / Blocked` |  |
| `APP117-OBS-002` | `delivery_captain_application_received` | Log shows applicant SMS/email decision |  | `Pass / Fail / Blocked` |  |
| `APP117-OBS-003` | `delivery_captain_guarantor_listed` | Log shows guarantor SMS decision with `emailEnabled=false` |  | `Pass / Fail / Blocked` |  |
| `APP117-OBS-004` | `vendor_application_reviewed` | Log shows admin review notification decision |  | `Pass / Fail / Blocked` |  |
| `APP117-OBS-005` | `delivery_captain_application_reviewed` | Log shows applicant-visible admin review notification decision |  | `Pass / Fail / Blocked` |  |

## Website Anchor Verification

| Test ID | Page/link | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `APP117-WEB-001` | `/riders#delivery-captain-application` | Delivery Captain application form is reached |  | `Pass / Fail / Blocked` |  |
| `APP117-WEB-002` | `/riders#ride-captain-application` | Ride Captain readiness application form is reached |  | `Pass / Fail / Blocked` |  |
| `APP117-WEB-003` | Old `#taxi-driver-application` anchor | No public website link uses the old anchor |  | `Pass / Fail / Blocked` |  |
| `APP117-WEB-004` | Home/service/footer Ride links | Links use Ride wording and readiness anchors |  | `Pass / Fail / Blocked` |  |
| `APP117-WEB-005` | Delivery Captain public form | Form remains Delivery Captain only; no payout/ride dispatch promise |  | `Pass / Fail / Blocked` |  |

## Guardrail Verification

| Guardrail | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- |
| Marketing SMS/email | No marketing, campaign or newsletter send occurs |  | `Pass / Fail / Blocked` |  |
| Order/payment/utility/referral SMS | Not enabled by this task |  | `Pass / Fail / Blocked` |  |
| Generic transactional email | Not enabled by this task |  | `Pass / Fail / Blocked` |  |
| Live Paystack | Disabled |  | `Pass / Fail / Blocked` |  |
| Ride dispatch | Disabled/readiness-only |  | `Pass / Fail / Blocked` |  |
| Payout automation | Disabled |  | `Pass / Fail / Blocked` |  |
| Captain/provider login | Not created by application approval |  | `Pass / Fail / Blocked` |  |
| Sensitive logs | No secrets, OTPs, full phone numbers or full emails logged |  | `Pass / Fail / Blocked` |  |

## Evidence Register

| Evidence ID | Test ID | Evidence type | Secure storage location | Redaction confirmed | Reviewer |
| --- | --- | --- | --- | --- | --- |
| `APP117-EVID-001` |  | `Screenshot / provider log / API response / admin screen` | `[External secure location]` | `Yes / No` |  |
| `APP117-EVID-002` |  |  |  |  |  |

## Issues Found

| Issue ID | Severity | Description | Owner | Status | Required before pilot invite |
| --- | --- | --- | --- | --- | --- |
| `APP117-001` | `P0/P1/P2/P3` |  |  | `Open / Resolved / Deferred` | `Yes / No` |
| `APP117-002` |  |  |  |  |  |

## Rollback

To return application notifications to mock/disabled mode, update staging/pilot
environment variables and redeploy. Do not remove submitted application records.

```dotenv
APPLICATION_NOTIFICATIONS_ENABLED=false
APPLICATION_EMAIL_NOTIFICATIONS_ENABLED=false
APPLICATION_EMAIL_NOTIFICATION_PROVIDER=mock
APPLICATION_SMS_NOTIFICATIONS_ENABLED=false
APPLICATION_SMS_NOTIFICATION_PROVIDER=mock
GUARANTOR_SMS_NOTIFICATIONS_ENABLED=false
```

After rollback, verify:

- Vendor applications still submit.
- Delivery Captain applications still submit.
- Admin can still review Delivery Captain applications.
- No Termii application SMS is sent.
- No Resend application email is sent.

## Final Verification Decision

| Decision item | Record |
| --- | --- |
| Admin Delivery Captain review verified | `Yes / No / Blocked` |
| Vendor application confirmation verified | `Yes / No / Blocked` |
| Delivery Captain applicant confirmation verified | `Yes / No / Blocked` |
| Delivery Captain guarantor notice verified | `Yes / No / Blocked` |
| Website anchors verified | `Yes / No / Blocked` |
| No unauthorized notification categories enabled | `Yes / No / Blocked` |
| Safe to begin pilot invitations | `Go / Conditional Go / No-Go` |
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
