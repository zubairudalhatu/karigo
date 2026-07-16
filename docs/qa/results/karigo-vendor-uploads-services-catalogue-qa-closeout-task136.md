# KariGO Vendor Uploads and Services Catalogue QA Closeout - Task 136

## Purpose

This document is the post-deployment QA closeout record for Vendor Dashboard uploads and the SME Services vendor catalogue introduced in Tasks 134 and 135.

This is a QA record only. It does not activate live payments, live payouts, live rides, ride dispatch, live utilities, Pharmacy marketplace, public provider login, marketing messaging or bulk messaging.

## Source Changes Under Review

| Task | Commit | Scope |
| --- | --- | --- |
| Task 134 | `52d319c` | Vendor-scoped uploads, onboarding document upload, product image upload, logo/cover upload, service image upload, Vendor Services catalogue and SME Services workspace. |
| Task 135 | `8ffdc8b` | Vendor Profile save fix after logo/cover upload, sanitized profile save payload, form-level error handling, save disabled while uploading/saving. |

## Deployment Status To Confirm

| Item | Expected status | QA confirmation |
| --- | --- | --- |
| Backend redeployed after Task 134 | Expected | Pending |
| Task 134 Prisma migration applied | Expected | Pending |
| Vendor Dashboard redeployed after Task 135 | Expected | Pending |
| Admin Portal redeploy | Not required for Task 135 | Pending confirmation |
| Customer APK | Not required | Pending confirmation |
| KariGO Captain APK | Not required | Pending confirmation |
| Live payments/rides/payouts/utilities | Disabled | Pending confirmation |

## Test Environment

| Field | Value |
| --- | --- |
| Environment | Staging / controlled pilot |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Vendor Dashboard | `https://vendor.karigo.com.ng` |
| Payment mode | Mock payment |
| Live provider status | Disabled unless separately approved |
| Tester | To be completed |
| Test date/time | To be completed |
| Evidence folder/reference | To be completed outside Git if screenshots contain private data |

## Manual QA Checklist

### 1. Vendor Onboarding Document Upload

| Test | Expected result | Status | Evidence / notes |
| --- | --- | --- | --- |
| Vendor logs into Vendor Dashboard. | Vendor workspace loads successfully. | Pending |  |
| Vendor opens Onboarding. | Onboarding page loads with upload control. | Pending |  |
| Vendor uploads PDF document. | Upload succeeds and document reference field is populated. | Pending |  |
| Vendor uploads image document. | Upload succeeds and document reference field is populated. | Pending |  |
| Vendor submits document for review. | Document appears in vendor onboarding list as pending review. | Pending |  |
| Admin reviews submitted document metadata. | Admin can view the submitted document reference. | Pending |  |
| Sensitive data check. | No passwords, OTPs, API keys, payment secrets or unnecessary private identity details are captured in evidence. | Pending |  |

### 2. Product Image Upload

| Test | Expected result | Status | Evidence / notes |
| --- | --- | --- | --- |
| Vendor opens Products. | Products page loads normally. | Pending |  |
| Vendor uploads product image from device. | Image upload succeeds and preview appears. | Pending |  |
| Vendor creates product using uploaded image. | Product is created successfully. | Pending |  |
| Product list refreshes. | Product displays uploaded image. | Pending |  |
| Existing product options/add-ons. | Option group and price-adjustment behaviour remains unchanged. | Pending |  |

### 3. Vendor Profile Logo and Cover Upload

| Test | Expected result | Status | Evidence / notes |
| --- | --- | --- | --- |
| Vendor opens Profile. | Profile page loads normally. | Pending |  |
| Vendor uploads business logo. | Logo upload succeeds and preview appears. | Pending |  |
| Vendor uploads cover image. | Cover upload succeeds and preview appears. | Pending |  |
| Vendor clicks Save profile. | Profile saves successfully without generic dashboard-load error. | Pending |  |
| Vendor refreshes Profile page. | Logo and cover image references persist. | Pending |  |
| Save button state. | Save is disabled while upload/save is in progress. | Pending |  |
| Form error handling. | Validation/save errors show as form-level messages, not dashboard-load failures. | Pending |  |

### 4. Vendor Services Catalogue

| Test | Expected result | Status | Evidence / notes |
| --- | --- | --- | --- |
| Vendor opens Services. | Services workspace loads from Vendor Dashboard navigation. | Pending |  |
| Vendor creates service record. | Service record is created successfully. | Pending |  |
| Vendor uploads service image. | Image upload succeeds and preview appears. | Pending |  |
| Vendor sets service areas. | Service areas save and display correctly. | Pending |  |
| Vendor edits service record. | Updated details persist after refresh. | Pending |  |
| Vendor archives service record. | Archived service is removed from active list. | Pending |  |
| Health professional service. | Remains readiness-only/inactive and cannot be used for live booking. | Pending |  |
| Service catalogue guardrail. | No customer booking, dispatch, payment collection, provider login or payout is activated. | Pending |  |

### 5. Access Control and Isolation

| Test | Expected result | Status | Evidence / notes |
| --- | --- | --- | --- |
| Unauthenticated upload request. | Request is rejected. | Pending |  |
| Non-vendor token attempts vendor upload. | Request is rejected. | Pending |  |
| Vendor A attempts Vendor B service access. | Cross-vendor access is rejected or impossible through UI/API. | Pending |  |
| Customer/Admin/Captain surfaces. | No upload/service catalogue controls appear on unrelated user surfaces. | Pending |  |

## Regression Checks

| Automated check | Expected result | Result |
| --- | --- | --- |
| Vendor Dashboard typecheck | Pass | Pending post-deploy record |
| Vendor Dashboard production build | Pass | Pending post-deploy record |
| Vendor Dashboard regression script | Pass | Pending post-deploy record |
| Backend build/tests for Task 134 endpoints | Pass | Pending post-deploy record |
| Secret scan on QA evidence/docs | No real secrets | Pending post-deploy record |

## Closeout Decision

Current closeout state: **Pending manual QA evidence**.

Decision options:

- **Closed - Passed:** all mandatory checklist items pass and no P0/P1 issue remains.
- **Closed - Passed with observation:** all core flows pass with minor non-blocking observations recorded.
- **Not closed - Fix required:** any upload, save, services catalogue, access-control or security test fails.
- **Paused:** deployment, migration or environment status cannot be confirmed.

Final decision: `Pending`.

## Issues Found During Verification

| ID | Severity | Area | Description | Owner | Status | Follow-up task |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

## Known Guardrails and Limitations

- Upload storage is backend-local for controlled staging/pilot testing. Production hardening should move files to approved object storage with access controls, retention policy, malware scanning and signed URL handling.
- Uploaded files and screenshots must not be committed to Git.
- Service catalogue remains internal to Vendor Dashboard in this release.
- SME Services service entries do not activate public provider login, automatic assignment, payment collection, payouts or live dispatch.
- Health professional entries remain readiness-only pending separate approval.

## Signoff

| Role | Name | Decision | Date/time | Notes |
| --- | --- | --- | --- | --- |
| QA tester |  | Pending |  |  |
| Operations reviewer |  | Pending |  |  |
| Product owner |  | Pending |  |  |
