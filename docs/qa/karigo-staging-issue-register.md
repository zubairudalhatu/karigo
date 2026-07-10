# KariGO Staging QA Issue Register

Test date: 10 July 2026
Environment: Staging
Source report: `docs/qa/karigo-full-platform-staging-qa-report.md`

No secrets, passwords, OTPs or tokens are recorded in this register.

| Issue ID | Area | Severity | Status | Description | Evidence | Recommended follow-up | Owner |
|---|---|---|---|---|---|---|---|
| QA-59-001 | Vendor custom domain | High | Open | `https://vendor.karigo.com.ng` serves Admin Portal HTML instead of Vendor Dashboard HTML. | GET response title is `KariGO Admin Portal`; vendor fallback `https://karigo-vendor-dashboard.vercel.app` correctly returns `KariGO Vendor Dashboard`. | Fix Vercel domain assignment/DNS so `vendor.karigo.com.ng` points to the Vendor Dashboard deployment. Retest page title and login. | Deployment/Frontend |
| QA-59-002 | Backend CORS | High | Open | Backend preflight for `https://admin.karigo.com.ng` returns `204` but does not echo `access-control-allow-origin`. Browser API calls from the admin custom domain may fail. | `OPTIONS /api/v1/auth/login` with admin custom origin returned no `access-control-allow-origin`; Vercel fallback origin is allowed. | Add/confirm `https://admin.karigo.com.ng` in Render `CORS_ORIGINS`, redeploy/restart backend, retest preflight and login. | Backend/Deployment |
| QA-59-003 | Backend CORS | High | Open | Backend preflight for `https://vendor.karigo.com.ng` returns `204` but does not echo `access-control-allow-origin`. Browser API calls from the vendor custom domain may fail after routing is fixed. | `OPTIONS /api/v1/auth/login` with vendor custom origin returned no `access-control-allow-origin`; Vercel fallback origin is allowed. | Add/confirm `https://vendor.karigo.com.ng` in Render `CORS_ORIGINS`, redeploy/restart backend, retest preflight and vendor login. | Backend/Deployment |
| QA-59-004 | Credentialed role QA | Medium | Blocked | Customer, Rider, Vendor and Admin role journeys were not executed in this automated pass because secure demo passwords were not provided to the QA runner. | Demo account docs intentionally reference `SUPER_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` only; no values are stored in Git. | Run manual credentialed QA using secure vault values and the Task 58 role checklists. Record results in the staging report template. | QA/Ops |
| QA-59-005 | Mobile app QA | Medium | Blocked | Physical Customer/Rider APK testing was not executed in this pass. | Typechecks passed, but no installed device session was available for navigation, order, rider job or delivery OTP checks. | Install current Customer and Rider staging APKs on approved Android devices and execute mobile role checklists. | QA/Mobile |

## Non-Issues Confirmed

| Area | Confirmation |
|---|---|
| Backend health | Healthy response returned from `/api/v1/health`. |
| Swagger | `/api/docs` reachable in staging. |
| Public website | `www`, apex, vendor, rider, contact, vendor application, privacy and terms pages returned `200 OK`. |
| Public discovery | Active seeded vendors/products returned for Food, Groceries and Market Items. |
| Readiness-gated services | Public website copy marks Taxi/Bills as coming soon and Pharmacy as preparing launch; discovery API returns Pharmacy disabled. |
| Protected endpoints | `GET /api/v1/auth/me` without token returns `401 Unauthorized`. |

## Priority Recommendation

1. Fix Vendor Dashboard custom-domain routing first.
2. Add the admin and vendor custom domains to backend staging CORS configuration.
3. Re-run portal login tests on custom domains.
4. Execute the credentialed role QA matrix using secure demo passwords.
5. Execute Customer/Rider APK checks on approved Android test devices.
