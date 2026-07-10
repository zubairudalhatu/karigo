# KariGO Credentialed Role QA Report - Task 60

Test date: 10 July 2026
Environment: Live staging
Backend API: `https://karigo-8htn.onrender.com/api/v1`
Backend health: `https://karigo-8htn.onrender.com/api/v1/health`
Public website: `https://www.karigo.com.ng`
Admin Portal: `https://admin.karigo.com.ng`
Vendor Dashboard: `https://vendor.karigo.com.ng`
Customer App channel: `customer-staging`
Rider App channel: `rider-staging`

This report extends the Task 59 QA results with the current credentialed-role evidence available for Task 60. No passwords, OTPs, access tokens, provider keys or private screenshots are recorded.

## Source Documents

- `docs/qa/karigo-full-platform-staging-qa-report.md`
- `docs/qa/karigo-staging-issue-register.md`
- `docs/qa/karigo-staging-launch-readiness-status.md`
- `docs/deployment/karigo-staging-demo-accounts.md`
- `docs/qa/customer-app-role-test-checklist.md`
- `docs/qa/rider-app-role-test-checklist.md`
- `docs/qa/vendor-dashboard-role-test-checklist.md`
- `docs/qa/admin-portal-role-test-checklist.md`
- `docs/qa/public-website-test-checklist.md`
- `docs/qa/backend-api-smoke-test-checklist.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`

## Test Method

The QA runner performed safe live staging checks that do not require storing or printing credentials. Password environment variables were checked by name only and were not available in this shell:

- `SEED_DEMO_PASSWORD`: not available
- `SUPER_ADMIN_PASSWORD`: not available
- `STAGING_DEMO_PASSWORD`: not available

Because no secure demo password was available to the runner, the runner did not submit login requests or print access tokens. The report accepts the provided staging evidence that Admin and Vendor authenticated dashboards are reachable from branded domains.

## Safe Live Staging Checks

| Area | Check | Result | Evidence |
|---|---|---|---|
| Backend health | `GET /api/v1/health` | Passed | `200 OK`, `success: true`, message `KariGO API is healthy`. |
| API prefix root | `GET /api/v1` | Passed as expected | `404 NOT_FOUND`; health must be checked at `/api/v1/health`. |
| Public website | `HEAD https://www.karigo.com.ng` | Passed | `200 OK`, Vercel response, SSL active. |
| Admin branded domain | `HEAD https://admin.karigo.com.ng` | Passed on retry | `200 OK`, Vercel response. One earlier DNS lookup failed and should be monitored. |
| Vendor branded domain | `HEAD https://vendor.karigo.com.ng` | Passed | `200 OK`, Vercel response. |
| Admin CORS | `OPTIONS /api/v1/auth/login` from `https://admin.karigo.com.ng` | Passed | `204 No Content`, `access-control-allow-origin: https://admin.karigo.com.ng`. |
| Vendor CORS | `OPTIONS /api/v1/auth/login` from `https://vendor.karigo.com.ng` | Passed | `204 No Content`, `access-control-allow-origin: https://vendor.karigo.com.ng`. |

## Credentialed Role Results

| Role surface | Demo account source | Current Task 60 status | Evidence | Remaining evidence needed |
|---|---|---|---|---|
| Super Admin | `SUPER_ADMIN_PHONE` / `SUPER_ADMIN_PASSWORD` | Partially passed | Provided evidence says authenticated Admin dashboard is reachable from `https://admin.karigo.com.ng`. | Full admin checklist evidence: dashboard, orders, dispatch, users, vendors, riders, payments, settlements, support, reports, utilities and Taxi readiness views. |
| Operations Admin | `+2348000000001` / `SEED_DEMO_PASSWORD` | Not independently executed | Secure password not available to runner. | Login and operations workflow evidence. |
| Demo Food Vendor | `+2348000000101` / `SEED_DEMO_PASSWORD` | Partially passed | Provided evidence says authenticated Vendor dashboard is reachable from `https://vendor.karigo.com.ng`. | Full vendor checklist evidence: orders, order detail, products, settlements, payout account, notifications and support. |
| Demo Grocery Vendor | `+2348000000102` / `SEED_DEMO_PASSWORD` | Not independently executed | Secure password not available to runner. | Vendor-scoped catalogue/order evidence. |
| Demo Market Vendor | `+2348000000103` / `SEED_DEMO_PASSWORD` | Not independently executed | Secure password not available to runner. | Vendor-scoped catalogue/order evidence. |
| Demo Customer | `+2348000000201` / `SEED_DEMO_PASSWORD` | Blocked | Secure password and mobile test-device session were not available to runner. | Customer App APK/EAS update evidence for login, address, vendor browse, checkout quote, promo, mock payment, order tracking, delivery OTP, support and notifications. |
| Demo Rider | `+2348000000401` / `SEED_DEMO_PASSWORD` | Blocked | Secure password and mobile test-device session were not available to runner. | Rider App APK/EAS update evidence for login, availability, job acceptance, status progression, delivery OTP completion, earnings and notifications. |

## Role Checklist Coverage

| Checklist | Status | Notes |
|---|---|---|
| Customer App role checklist | Blocked | Requires secure demo password and installed staging app/device. |
| Rider App role checklist | Blocked | Requires secure demo password and installed staging app/device. |
| Vendor Dashboard role checklist | Partially passed | Branded domain and authenticated dashboard reachability confirmed; full role checklist still requires recorded evidence. |
| Admin Portal role checklist | Partially passed | Branded domain and authenticated dashboard reachability confirmed; full role checklist still requires recorded evidence. |
| Public Website checklist | Passed for availability | Public website is reachable; form submission evidence remains optional/manual. |
| Backend API smoke checklist | Partially passed | Health, prefix behavior and CORS passed; protected role endpoints require secure bearer tokens. |
| Full platform launch readiness checklist | Partially passed | Deployment blockers are resolved; role-flow evidence is still incomplete. |

## Security Notes

- No credential values were available or recorded.
- No login response tokens were printed.
- No delivery OTPs were requested or recorded.
- No live provider credentials were used.
- Mock/staging providers remain the expected default.

## Task 60 QA Conclusion

The branded web dashboard deployment blocker from Task 59 is resolved. Admin and Vendor branded domains are now suitable for management review and continued credentialed QA.

However, independent full credentialed role QA is not complete because the QA runner did not have a secure password source or mobile test-device sessions. Controlled soft launch remains gated on completing Customer, Rider, Vendor and Admin role checklists with secure evidence.
