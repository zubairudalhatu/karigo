# KariGO Credentialed Mobile E2E QA Report - Task 61

Test date: 10 July 2026
Environment: Live staging
Backend API: `https://karigo-8htn.onrender.com/api/v1`
Backend health: `https://karigo-8htn.onrender.com/api/v1/health`
Public website: `https://www.karigo.com.ng`
Admin Portal: `https://admin.karigo.com.ng`
Vendor Dashboard: `https://vendor.karigo.com.ng`
Customer App channel: `customer-staging`
Rider App channel: `rider-staging`

This Task 61 report attempts to close the remaining soft-launch blocker from Task 60: full credentialed mobile role QA and end-to-end order evidence. No passwords, OTPs, bearer tokens, provider credentials or private screenshots are recorded.

## Source Documents

- `docs/qa/results/karigo-credentialed-role-qa-report-task60.md`
- `docs/qa/results/karigo-soft-launch-fix-plan-task60.md`
- `docs/qa/results/karigo-soft-launch-go-no-go-task60.md`
- `docs/deployment/karigo-staging-demo-accounts.md`
- `docs/qa/customer-app-role-test-checklist.md`
- `docs/qa/rider-app-role-test-checklist.md`
- `docs/qa/vendor-dashboard-role-test-checklist.md`
- `docs/qa/admin-portal-role-test-checklist.md`
- `docs/qa/backend-api-smoke-test-checklist.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`

## Credential Access Check

The QA runner checked for approved environment variables by name only. Values were not printed.

| Credential source | Available to runner | Result |
|---|---:|---|
| `SEED_DEMO_PASSWORD` | No | Blocked |
| `SUPER_ADMIN_PASSWORD` | No | Blocked |
| `STAGING_DEMO_PASSWORD` | No | Blocked |

Because no secure credential source was available, the runner did not submit login requests, did not capture bearer tokens and did not attempt credentialed API calls.

## Safe Live Staging Checks Completed

| Area | Check | Result | Evidence |
|---|---|---|---|
| Backend health | `GET /api/v1/health` | Passed | `200 OK`, `success: true`, message `KariGO API is healthy`. |
| API prefix root | `GET /api/v1` | Passed as expected | `404 NOT_FOUND`; health must be checked at `/api/v1/health`. |
| Public website | `HEAD https://www.karigo.com.ng` | Passed | `200 OK`, Vercel response. |
| Admin branded domain | `HEAD https://admin.karigo.com.ng` | Passed on retry | `200 OK`, Vercel response. |
| Vendor branded domain | `HEAD https://vendor.karigo.com.ng` | Passed | `200 OK`, Vercel response. |
| Admin CORS | `OPTIONS /api/v1/auth/login` from `https://admin.karigo.com.ng` | Passed | `access-control-allow-origin: https://admin.karigo.com.ng`. |
| Vendor CORS | `OPTIONS /api/v1/auth/login` from `https://vendor.karigo.com.ng` | Passed | `access-control-allow-origin: https://vendor.karigo.com.ng`. |

## Credentialed Role QA Execution

| Role surface | Expected account | Task 61 status | Reason |
|---|---|---|---|
| Customer App | Demo Customer | Blocked | Secure demo password and mobile test-device/app session were not available to the runner. |
| Rider App | Demo Rider | Blocked | Secure demo password and mobile test-device/app session were not available to the runner. |
| Vendor Dashboard | Demo Food/Grocery/Market Vendor | Blocked for independent execution | Secure demo password was not available to the runner. Previous evidence says branded dashboard reachability works. |
| Admin Portal | Super Admin / Operations Admin | Blocked for independent execution | Secure demo password was not available to the runner. Previous evidence says branded dashboard reachability works. |
| Backend protected API | Role bearer tokens | Blocked | No credentials were available to obtain fresh tokens without exposing secrets. |

## End-to-End Order Evidence

Required Task 61 E2E flow:

1. Customer logs in.
2. Customer creates order from staged vendor catalogue.
3. Customer completes mock payment.
4. Vendor receives paid order and accepts it.
5. Admin assigns rider.
6. Rider progresses delivery statuses.
7. Customer views delivery OTP only at eligible status.
8. Rider completes delivery with customer-supplied OTP.
9. Admin/vendor/rider financial records update.
10. Support and notification records are checked.

Task 61 result: Not executed by this runner because secure credentials and mobile app sessions were unavailable.

## Product Issues Found

No new product/code issues were confirmed in Task 61 because credentialed and mobile flows could not be executed. The remaining issue is an execution blocker, not a newly confirmed product defect.

| Issue ID | Area | Severity | Status | Description | Recommended action |
|---|---|---|---|---|
| T61-001 | Secure credentials | Critical for QA | Open | Demo password variables were not available to the QA runner. | Provide credentials through an approved secret manager or local environment variables without committing or logging values. |
| T61-002 | Mobile device QA | Critical for soft launch | Open | Customer/Rider staging app sessions were not available to the QA runner. | Run Customer and Rider APK/EAS channel tests on approved Android devices. |
| T61-003 | Full E2E order evidence | Critical for soft launch | Open | A fresh credentialed order-to-delivery lifecycle was not recorded in Task 61. | Execute a controlled staging order and record masked evidence only. |

## Task 61 Conclusion

The remaining soft-launch blocker is not closed. Staging infrastructure remains healthy, and branded Admin/Vendor domains are usable, but controlled soft launch cannot be signed off until secure credentialed role QA and mobile E2E evidence are completed.
