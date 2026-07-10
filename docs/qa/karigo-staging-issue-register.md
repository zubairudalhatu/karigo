# KariGO Staging QA Issue Register

Test date: 10 July 2026
Environment: Staging
Source report: `docs/qa/karigo-full-platform-staging-qa-report.md`

No secrets, passwords, OTPs or tokens are recorded in this register.

| Issue ID | Area | Severity | Status | Description | Evidence | Recommended follow-up | Owner |
|---|---|---|---|---|---|---|---|
| QA-59-001 | Vendor custom domain | High | Resolved | `https://vendor.karigo.com.ng` now serves the Vendor Dashboard correctly. | Branded vendor domain loads the Vendor Dashboard; authenticated dashboard reachability is confirmed. | No further routing action required. Keep monitoring during deployment changes. | Deployment/Frontend |
| QA-59-002 | Backend CORS | High | Resolved | Backend preflight for `https://admin.karigo.com.ng` now echoes the admin branded origin. | `OPTIONS /api/v1/auth/login` returns `access-control-allow-origin: https://admin.karigo.com.ng`. | No further CORS action required for this origin. Retest after backend env changes. | Backend/Deployment |
| QA-59-003 | Backend CORS | High | Resolved | Backend preflight for `https://vendor.karigo.com.ng` now echoes the vendor branded origin. | `OPTIONS /api/v1/auth/login` returns `access-control-allow-origin: https://vendor.karigo.com.ng`. | No further CORS action required for this origin. Retest after backend env changes. | Backend/Deployment |
| QA-59-004 | Credentialed role QA | Medium | Blocked | Customer, Rider, Vendor and Admin role journeys were not executed in this automated pass because secure demo passwords were not provided to the QA runner. | Demo account docs intentionally reference `SUPER_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` only; no values are stored in Git. | Run manual credentialed QA using secure vault values and the Task 58 role checklists. Record results in the staging report template. | QA/Ops |
| QA-59-005 | Mobile app QA | Medium | Blocked | Physical Customer/Rider APK testing was not executed in this pass. | Typechecks passed, but no installed device session was available for navigation, order, rider job or delivery OTP checks. | Install current Customer and Rider staging APKs on approved Android devices and execute mobile role checklists. | QA/Mobile |

## Non-Issues Confirmed

| Area | Confirmation |
|---|---|
| Backend health | Healthy response returned from `/api/v1/health`. |
| API prefix root | `/api/v1` returning `NOT_FOUND` is expected; use `/api/v1/health` for health checks. |
| Swagger | `/api/docs` reachable in staging. |
| Public website | `www`, apex, vendor, rider, contact, vendor application, privacy and terms pages returned `200 OK`. |
| Branded portals | `admin.karigo.com.ng` and `vendor.karigo.com.ng` now serve the correct portals and authenticated dashboards are reachable. |
| Public discovery | Active seeded vendors/products returned for Food, Groceries and Market Items. |
| Readiness-gated services | Public website copy marks Taxi/Bills as coming soon and Pharmacy as preparing launch; discovery API returns Pharmacy disabled. |
| Protected endpoints | `GET /api/v1/auth/me` without token returns `401 Unauthorized`. |

## Priority Recommendation

1. Execute the remaining credentialed role QA matrix using secure demo passwords.
2. Execute Customer/Rider APK checks on approved Android test devices.
3. Keep branded Admin/Vendor domain routing and CORS in the deployment regression checklist.
4. Record full end-to-end order, dispatch, rider completion and support evidence without exposing credentials or OTPs.
