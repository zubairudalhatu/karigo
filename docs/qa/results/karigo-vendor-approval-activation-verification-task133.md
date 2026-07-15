# Task 133 Vendor Approval Activation Verification

Use this checklist to verify the deployed vendor approval-to-activation and onboarding
document flow.

Do not record passwords, activation tokens, full activation links, private uploaded
documents, full phone numbers, full email addresses, OTPs, API keys or provider secrets
in this file.

## Deployment Verification

| Item | Expected result | Status | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
| Task 133 backend deployed | Approval bridge and onboarding document routes live | `Pass / Fail / Blocked` |  |  |
| Task 133 migration applied | No pending Prisma migrations | `Pass / Fail / Blocked` |  |  |
| Admin Portal deployed | Vendor Applications and Vendors pages updated | `Pass / Fail / Blocked` |  |  |
| Vendor Dashboard deployed | Activation and Onboarding pages available | `Pass / Fail / Blocked` |  |  |
| Live provider guardrails | Live payments, payouts, rides, utilities and bulk messaging disabled | `Pass / Fail / Blocked` |  |  |

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| `VEND133-001` | Submit Kano vendor application | Application is accepted and visible in Admin Portal |  | `Pass / Fail / Blocked` |
| `VEND133-002` | Admin approves application | Vendor user and Vendor record are created/linked |  | `Pass / Fail / Blocked` |
| `VEND133-003` | Admin checks Vendor Applications page | Linked vendor account and activation status are visible |  | `Pass / Fail / Blocked` |
| `VEND133-004` | Applicant receives approval email | Email includes secure password setup link |  | `Pass / Fail / Blocked` |
| `VEND133-005` | SMS review notification enabled | SMS does not include activation token; it directs user to email |  | `Pass / Fail / Blocked` |
| `VEND133-006` | Vendor opens activation link | Activation page loads without requiring prior login |  | `Pass / Fail / Blocked` |
| `VEND133-007` | Vendor sets password | Account activates and Vendor Dashboard session starts |  | `Pass / Fail / Blocked` |
| `VEND133-008` | Reuse activation link | Used token is rejected |  | `Pass / Fail / Blocked` |
| `VEND133-009` | Vendor uploads onboarding document metadata | Document appears in Vendor Dashboard and Admin Vendors page |  | `Pass / Fail / Blocked` |
| `VEND133-010` | Admin rejects document | Vendor sees rejected status and admin note |  | `Pass / Fail / Blocked` |
| `VEND133-011` | Admin approves corrected documents | Documents show approved status |  | `Pass / Fail / Blocked` |
| `VEND133-012` | Admin marks vendor operational before docs approved | Backend blocks status change |  | `Pass / Fail / Blocked` |
| `VEND133-013` | Admin marks vendor operational after docs approved | Vendor status becomes `ACTIVE` |  | `Pass / Fail / Blocked` |
| `VEND133-014` | Cross-vendor isolation | Vendor cannot see or alter another vendor's onboarding documents |  | `Pass / Fail / Blocked` |

## Evidence Register

| Evidence ID | Test ID | Evidence type | Secure storage location | Redaction confirmed |
| --- | --- | --- | --- | --- |
| `VEND133-EVID-001` |  | `Screenshot / API response / email header / admin screen` | `[External secure location]` | `Yes / No` |
| `VEND133-EVID-002` |  |  |  |  |

## Issue Register

| Issue ID | Severity | Description | Owner | Status | Required before vendor onboarding |
| --- | --- | --- | --- | --- | --- |
| `VEND133-ISS-001` | `P0/P1/P2/P3` |  |  | `Open / Resolved / Deferred` | `Yes / No` |
| `VEND133-ISS-002` |  |  |  |  |  |

## Final Decision

| Decision item | Record |
| --- | --- |
| Approval creates/links Vendor account | `Yes / No / Blocked` |
| Activation email includes setup link | `Yes / No / Blocked` |
| Vendor can set password and log in | `Yes / No / Blocked` |
| Onboarding document review works | `Yes / No / Blocked` |
| Vendor operational status gate works | `Yes / No / Blocked` |
| Safe for controlled vendor onboarding | `Go / Conditional Go / No-Go` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
