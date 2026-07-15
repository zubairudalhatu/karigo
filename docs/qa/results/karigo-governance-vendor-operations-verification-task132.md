# Task 132 Governance, Vendor Operations and Activation QA Verification

## Purpose

This is the official post-deployment QA verification record for the Task 131
governance and vendor operations foundation.

This record covers only:

- Admin audit logs.
- Admin login activity.
- Integration settings visibility.
- Vendor audit/activity logs.
- Vendor team invitation records.
- Vendor branches and locations.
- Vendor logo and cover image URL fields.
- Vendor activation and password setup flow.
- Vendor and Delivery Captain application document metadata.
- Delivery Captain application profile photo metadata.
- Biometric credential readiness foundation.
- Login/activity logging.

This verification does not activate live Paystack, Monnify, Squad, Accelerate.ng
utilities, wallet withdrawals, automatic refunds, live rides, ride dispatch, payouts,
provider login for public providers, Pharmacy marketplace, marketing SMS, promotional
email, newsletter email or bulk SMS/email.

## Current Deployment Status

| Area | Expected state | Result | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| Task 131 commit | `802b1ab` deployed | `Pass / Fail / Blocked` |  |  |
| Backend API | Deployed and healthy | `Pass / Fail / Blocked` |  |  |
| Prisma migration | Applied; no pending migrations | `Pass / Fail / Blocked` |  |  |
| Prisma generate | Completed in deployment | `Pass / Fail / Blocked` |  |  |
| Admin Portal | Deployed | `Pass / Fail / Blocked` |  |  |
| Vendor Dashboard | Deployed | `Pass / Fail / Blocked` |  |  |
| Customer APK | Not required for Task 132 | `Pass / Fail / N/A` |  |  |
| Captain APK | Not required for Task 132 | `Pass / Fail / N/A` |  |  |
| Live payments | Disabled | `Pass / Fail / Blocked` |  |  |
| Live rides/dispatch | Disabled | `Pass / Fail / Blocked` |  |  |
| Payout/wallet automation | Disabled | `Pass / Fail / Blocked` |  |  |
| Developer settings | Read-only visibility only | `Pass / Fail / Blocked` |  |  |

## Verification Ownership

| Role | Owner | Date/time | Notes |
| --- | --- | --- | --- |
| Technical lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Operations lead | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Vendor operations reviewer | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Security reviewer | `[Name]` | `[DD Month YYYY, HH:MM]` |  |
| Management reviewer | `[Name]` | `[DD Month YYYY, HH:MM]` |  |

## Evidence Safety Rules

- Do not record passwords.
- Do not record activation tokens or full activation links.
- Do not record access tokens, session tokens, OTPs, API keys, webhook secrets or
  provider credentials.
- Do not commit uploaded documents, screenshots containing private documents, APKs,
  `.env` files or private staging evidence.
- Do not record full phone numbers, full emails, bank details or private identity
  document numbers.
- Use masked references only, such as `+23480*****78`, `a***@example.com`,
  `VND-***123` or `DOC-***456`.
- Store sensitive screenshots and evidence outside the repository in the approved
  secure evidence location.

## Environment And Guardrail Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `GOV132-ENV-001` | Backend health check | API responds normally |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-002` | Prisma migration status | Migration status is clean; no pending Task 131 migration |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-003` | Admin Portal branded domain | Admin Portal loads and authenticates |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-004` | Vendor Dashboard branded domain | Vendor Dashboard loads and authenticates |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-005` | Developer settings page | Shows mode/configured status only; no secret values |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-006` | Payment guardrail | Mock payment remains default; live providers disabled |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-007` | Ride guardrail | Live rides and ride dispatch remain disabled/readiness-only |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-008` | Provider login guardrail | Public service provider login remains inactive |  | `Pass / Fail / Blocked` |  |
| `GOV132-ENV-009` | Notification guardrail | No marketing/bulk messaging enabled by this task |  | `Pass / Fail / Blocked` |  |

## Admin Audit Log Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-ADMIN-001` | Admin opens Audit Logs page | Page loads from Admin Portal navigation |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ADMIN-002` | Admin list loads | Recent audit events display with action, actor, target and date |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ADMIN-003` | Non-admin access attempt | Request is rejected by backend authorization |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ADMIN-004` | Create vendor activation link | Admin audit event is recorded without exposing token value |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ADMIN-005` | Review sensitive action metadata | No passwords, OTPs, provider keys or full private records are shown |  | `Pass / Fail / Blocked` |  |  |

## Login Activity Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-LOGIN-001` | Successful admin login | Success activity appears with masked phone/user metadata |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-LOGIN-002` | Failed login attempt | Failed activity appears without storing attempted password |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-LOGIN-003` | Blocked/inactive account attempt | Blocked activity appears where applicable |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-LOGIN-004` | Admin opens Login Activity page | Latest activity list loads with outcome badges |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-LOGIN-005` | Sensitive data review | No password, raw token or OTP is visible in UI/API/logs |  | `Pass / Fail / Blocked` |  |  |

## Vendor Activation Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-ACT-001` | Admin creates activation link for approved vendor | One-time link is generated and shown only once |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-002` | Activation link is copied to secure channel | No full link/token is written into Git or QA docs |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-003` | Vendor opens activation page | Vendor Dashboard activation page loads without login |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-004` | Vendor sets password | Account activates and session is created |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-005` | Vendor logs in after activation | Vendor can access own dashboard |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-006` | Reuse same activation link | Link is rejected after use |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-007` | Expired or revoked link | Link is rejected safely |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-ACT-008` | Activation audit | Vendor audit event and admin audit event are recorded safely |  | `Pass / Fail / Blocked` |  |  |

## Vendor Branch Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-BRANCH-001` | Vendor opens Branches page | Page loads for authenticated vendor |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRANCH-002` | Create branch | Branch is created with name, address, city/state and status |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRANCH-003` | Update branch | Branch details update without affecting other vendors |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRANCH-004` | Primary branch behavior | Primary branch is clearly marked where applicable |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRANCH-005` | Cross-vendor access attempt | Vendor cannot view or update another vendor's branch |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRANCH-006` | Branch audit | Create/update branch actions appear in vendor audit log |  | `Pass / Fail / Blocked` |  |  |

## Vendor Team Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-TEAM-001` | Vendor opens Team page | Page loads for authenticated vendor |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-002` | Create team invitation | Invitation record is created with selected role |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-003` | Role selection | Supported roles display clearly and save correctly |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-004` | Revoke invitation/member | Status changes to revoked/inactive as designed |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-005` | Invitation notification guardrail | No SMS/email invitation is sent by this foundation |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-006` | Cross-vendor access attempt | Vendor cannot manage another vendor's team records |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-TEAM-007` | Team audit | Team create/update/revoke actions appear in vendor audit log |  | `Pass / Fail / Blocked` |  |  |

## Vendor Branding Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-BRAND-001` | Vendor opens Profile page | Logo URL and cover image URL fields are visible |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRAND-002` | Save logo URL | URL saves and reloads without affecting product/order data |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRAND-003` | Save cover image URL | URL saves and reloads safely |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRAND-004` | Invalid/private asset review | Team confirms private files are not committed or exposed |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BRAND-005` | Branding audit | Profile update is recorded in vendor audit log |  | `Pass / Fail / Blocked` |  |  |

## Application Document Metadata Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-DOC-001` | Submit vendor application with document metadata | Application is accepted and metadata is visible in Admin Portal |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-DOC-002` | Submit Delivery Captain application with document metadata | Application is accepted and metadata is visible in Admin Portal |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-DOC-003` | Delivery Captain profile photo metadata | Profile photo URL/reference displays in Admin Portal where provided |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-DOC-004` | Customer/vendor public surfaces | Application document metadata is not shown on public customer/vendor surfaces |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-DOC-005` | Sensitive document evidence | Screenshots and uploaded files are stored outside Git with redaction |  | `Pass / Fail / Blocked` |  |  |

## Vendor Audit Log Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-VAUDIT-001` | Vendor opens Audit Logs page | Page loads recent vendor-scoped audit events |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-VAUDIT-002` | Vendor branch action | Branch action appears in vendor audit log |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-VAUDIT-003` | Vendor team action | Team action appears in vendor audit log |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-VAUDIT-004` | Vendor branding action | Profile/branding action appears in vendor audit log |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-VAUDIT-005` | Cross-vendor visibility | Vendor sees only own audit events |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-VAUDIT-006` | Sensitive data review | Audit log does not reveal passwords, tokens, OTPs or private document values |  | `Pass / Fail / Blocked` |  |  |

## Biometric Readiness Verification

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Tester |
| --- | --- | --- | --- | --- | --- | --- |
| `GOV132-BIO-001` | Schema readiness review | Biometric credential model exists after migration |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BIO-002` | Login behavior review | No biometric login prompt or passwordless auth is active |  | `Pass / Fail / Blocked` |  |  |
| `GOV132-BIO-003` | Data safety review | No fingerprint image/template is collected in this task |  | `Pass / Fail / Blocked` |  |  |

## Evidence Register

| Evidence ID | Test ID | Evidence type | Secure storage location | Redaction confirmed | Reviewer |
| --- | --- | --- | --- | --- | --- |
| `GOV132-EVID-001` |  | `Screenshot / API response / admin screen / vendor screen / log excerpt` | `[External secure location]` | `Yes / No` |  |
| `GOV132-EVID-002` |  |  |  |  |  |
| `GOV132-EVID-003` |  |  |  |  |  |

## Final Verification Decision

| Decision item | Record |
| --- | --- |
| Admin audit logs verified | `Yes / No / Blocked` |
| Login activity verified | `Yes / No / Blocked` |
| Vendor audit logs verified | `Yes / No / Blocked` |
| Vendor team records verified | `Yes / No / Blocked` |
| Vendor branch records verified | `Yes / No / Blocked` |
| Vendor branding fields verified | `Yes / No / Blocked` |
| Vendor activation flow verified | `Yes / No / Blocked` |
| Application document metadata verified | `Yes / No / Blocked` |
| Developer settings safe/read-only | `Yes / No / Blocked` |
| Biometric readiness remains inactive | `Yes / No / Blocked` |
| No unauthorized live services activated | `Yes / No / Blocked` |
| Safe to proceed with wider pilot expansion | `Go / Conditional Go / No-Go` |
| Conditions before expansion |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
