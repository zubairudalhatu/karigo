# KariGO Soft Launch Release Candidate - Task 107

Date prepared: 2026-07-13

## 1. Release Stage

KariGO is preparing a controlled soft launch release candidate for Kano pilot users.

This release candidate is for controlled pilot distribution only. It does not activate
live Paystack, live Accelerate.ng utilities, live Termii SMS, wallet withdrawals,
automatic refunds, live rides, payouts, Pharmacy marketplace, provider login or public
production launch.

## 2. Release Surfaces

| Surface | Release Candidate Status | Link/Build Placeholder | Notes |
| --- | --- | --- | --- |
| Customer App APK | Release candidate required | [CUSTOMER_APK_BUILD_URL] | Use approved EAS build/update only |
| KariGO Captain APK | Release candidate required | [CAPTAIN_APK_BUILD_URL] | Confirm app name and Delivery Captain mode |
| Website | Ready after domain check | https://www.karigo.com.ng | Check contact, vendor application and legal pages |
| Admin Portal | Ready after admin login check | https://admin.karigo.com.ng | Admin login and operations sections must work |
| Vendor Dashboard | Ready after vendor login check | https://vendor.karigo.com.ng | Vendor login, products, orders and settlements must work |
| Backend API | Ready after health check | https://karigo-8htn.onrender.com/api/v1 | Health endpoint must pass |
| Paystack Test Mode | Test Mode only | [PAYSTACK_TEST_MODE_DECISION] | Live Paystack remains disabled |
| Accelerate.ng | Future integration, not live | Not applicable | No live utility fulfilment |
| Termii | Future integration, not live | Not applicable | No live SMS sending |

## 3. Build Placeholders

| Field | Value |
| --- | --- |
| Customer APK build URL |  |
| Customer build date |  |
| Customer runtime version |  |
| Customer app version |  |
| Captain APK build URL |  |
| Captain build date |  |
| Captain runtime version |  |
| Captain app version |  |
| Backend deploy commit |  |
| Website deploy commit |  |
| Admin deploy commit |  |
| Vendor deploy commit |  |
| Approved by |  |
| Date |  |

## 4. Release Decision

| Field | Value |
| --- | --- |
| Decision | Ready / Conditional Ready / Not Ready |
| Conditions |  |
| Approval note |  |
| Pilot scope | Kano controlled early access |
| Distribution audience | Approved pilot users only |
| Public sharing allowed | No |

## Release Candidate Guardrails

- Do not publish APK links publicly during controlled early access.
- Do not distribute unapproved builds.
- Do not record passwords, OTPs, delivery codes, payment details or provider credentials.
- Keep mock payment as the default unless Paystack Test Mode is explicitly approved.
- Keep Accelerate.ng and Termii future-only until separate integration approval.

