# KariGO Soft Launch Signoff Evidence - Task 61

Date: 10 July 2026
Environment: Live staging

This signoff evidence file summarizes whether KariGO can move from staging QA to controlled soft launch after Task 61.

## Decision

Current decision: No-Go for controlled soft launch.

Reason: The remaining blocker from Task 60 is still open. Full credentialed mobile role QA and a fresh end-to-end order lifecycle were not completed in Task 61 because the QA runner did not have secure demo credentials or mobile test-device sessions.

## Evidence Matrix

| Area | Status | Evidence |
|---|---|---|
| Backend health | Passed | `/api/v1/health` returned healthy response. |
| API prefix behavior | Passed | `/api/v1` returned expected `NOT_FOUND`; health checks must use `/api/v1/health`. |
| Public website | Passed | `https://www.karigo.com.ng` returned `200 OK`. |
| Admin branded domain | Passed | `https://admin.karigo.com.ng` returned `200 OK` on retry. |
| Vendor branded domain | Passed | `https://vendor.karigo.com.ng` returned `200 OK`. |
| Branded-domain CORS | Passed | Admin and Vendor origins are allowed by backend preflight. |
| Customer App credentialed QA | Not signed off | Secure credential and device session unavailable. |
| Rider App credentialed QA | Not signed off | Secure credential and device session unavailable. |
| Vendor Dashboard full QA | Not signed off | Secure credential unavailable to runner; dashboard reachability evidence exists. |
| Admin Portal full QA | Not signed off | Secure credential unavailable to runner; dashboard reachability evidence exists. |
| Full order-to-delivery E2E | Not signed off | Fresh masked order evidence not recorded in Task 61. |
| Mock payment flow | Not signed off | Must be revalidated in full credentialed E2E flow. |
| Delivery OTP completion | Not signed off | Must be revalidated in customer/rider E2E flow without recording OTP values. |
| Support workflow | Not signed off | Must be revalidated with customer/admin roles. |
| Bills & Utilities | Test-mode only | Do not activate live fulfilment. |
| Taxi | Readiness only | Do not activate live booking. |
| Pharmacy | Readiness only | Do not activate marketplace. |

## Conditions Required For Soft Launch Signoff

- Secure demo credentials available to QA without being printed or committed.
- Customer App login and order lifecycle completed on staging app.
- Rider App login and delivery lifecycle completed on staging app.
- Vendor Dashboard order acceptance and status flow completed.
- Admin Portal dispatch, support, settlement and reporting checks completed.
- One fresh masked staging order reference recorded from customer order through delivery completion.
- No critical or high-severity access control, payment, pricing, dispatch, OTP or settlement defects open.

## Signoff Recommendation

Do not begin controlled soft launch yet. Proceed with a credential-enabled QA session on approved devices and update this file only after the end-to-end evidence is captured.
