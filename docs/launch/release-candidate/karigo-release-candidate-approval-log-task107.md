# KariGO Release Candidate Approval Log - Task 107

Date prepared: 2026-07-13

Use this log to record which release-candidate builds, domains and services are approved
for controlled pilot distribution. Do not record passwords, OTPs, API keys, payment test
details, APK files or sensitive screenshots.

## Approval Table

| Date | Surface | Build/link | Checked by | Result | Issues | Decision | Approved by | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | Customer App | [CUSTOMER_APK_BUILD_URL] |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | KariGO Captain App | [CAPTAIN_APK_BUILD_URL] |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Backend API | https://karigo-8htn.onrender.com/api/v1/health |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Website | https://www.karigo.com.ng |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Admin Portal | https://admin.karigo.com.ng |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Vendor Dashboard | https://vendor.karigo.com.ng |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Payment mode | Mock / Approved Paystack Test Mode |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |
|  | Support channel | [SUPPORT_CONTACT_PLACEHOLDER] |  | Passed / Failed / Blocked |  | Ready / Conditional / Not Ready |  |  |

## Final Release Candidate Decision

| Field | Value |
| --- | --- |
| Final decision | Ready / Conditional Ready / Not Ready |
| Conditions |  |
| Distribution audience | Approved Kano pilot users only |
| Public distribution allowed | No |
| Final approver |  |
| Date/time |  |

## Immediate Hold Conditions

Mark release candidate as Not Ready if:

- Customer or KariGO Captain APK is not the approved build.
- Admin/Vendor branded domains fail login checks.
- Backend health fails.
- Live Paystack, live utilities, live SMS, wallet withdrawal, automatic refund, live ride,
  payout automation, provider login or Pharmacy marketplace appears active.
- Sensitive data appears in evidence or distribution material.
