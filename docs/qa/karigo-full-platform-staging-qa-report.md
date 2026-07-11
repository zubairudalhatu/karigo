# KariGO Full Platform Staging QA Report

Test date: 10 July 2026
Environment: Staging
Backend API: `https://karigo-8htn.onrender.com/api/v1`
Public website: `https://www.karigo.com.ng`, `https://karigo.com.ng`
Admin portal: `https://admin.karigo.com.ng`, fallback `https://karigo-admin-portal.vercel.app`
Vendor dashboard: `https://vendor.karigo.com.ng`, fallback `https://karigo-vendor-dashboard.vercel.app`

This report records a read-only automated staging QA pass plus local build/typecheck validation. Credentialed role journeys and physical mobile APK journeys were not executed in this pass because no secure demo password or test device session was supplied to the QA runner. No real passwords, OTPs, access tokens, provider keys or private screenshots are included.

## Source Checklists Used

- `docs/deployment/karigo-staging-demo-accounts.md`
- `docs/deployment/karigo-staging-environment-flags.md`
- `docs/deployment/karigo-deployment-verification-checklist.md`
- `docs/operations/karigo-known-limitations-and-prelaunch-risks.md`
- `docs/qa/customer-app-role-test-checklist.md`
- `docs/qa/rider-app-role-test-checklist.md`
- `docs/qa/vendor-dashboard-role-test-checklist.md`
- `docs/qa/admin-portal-role-test-checklist.md`
- `docs/qa/public-website-test-checklist.md`
- `docs/qa/backend-api-smoke-test-checklist.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`
- `docs/qa/karigo-staging-test-report-template.md`

## Executive Summary

| Area | Result | Notes |
|---|---|---|
| Backend health | Passed | `GET /health` returned healthy JSON. |
| Swagger/API docs | Passed | `GET /api/docs` returned `200 OK`. |
| Public website domains | Passed | `www` and apex domains returned `200 OK` with SSL. |
| Public website content | Passed | Food, groceries, market, parcel and SME Services shown as live; Taxi, Bills and Pharmacy are clearly gated. |
| Admin portal fallback | Passed | `karigo-admin-portal.vercel.app` returned Admin Portal HTML. |
| Vendor dashboard fallback | Passed | `karigo-vendor-dashboard.vercel.app` returned Vendor Dashboard HTML. |
| Admin custom domain | Passed | `https://admin.karigo.com.ng` loads the Admin Portal and authenticated dashboard access is confirmed. |
| Vendor custom domain | Passed | `https://vendor.karigo.com.ng` loads the Vendor Dashboard and authenticated dashboard access is confirmed. |
| Custom-domain API CORS | Passed | Backend preflight now echoes `access-control-allow-origin` for admin and vendor branded domains. |
| Public vendor/product discovery | Passed | Active food, grocery and market vendors/products returned. |
| Bills & Utilities catalogue | Passed for test catalogue | Demo utility providers returned; live fulfilment remains intentionally inactive. |
| Protected endpoint guard | Passed | `GET /auth/me` without token returned `401 Unauthorized`. |
| Customer App role QA | Blocked for live credentialed run | Requires secure demo password and Android/iOS test session. Static config/build validation passed. |
| Rider App role QA | Blocked for live credentialed run | Requires secure demo password and Android test session. Static config/build validation passed. |
| Vendor Dashboard credentialed QA | Partially passed | Branded-domain authenticated dashboard reachability is confirmed; full vendor checklist still requires secure test evidence. |
| Admin Portal credentialed QA | Partially passed | Branded-domain authenticated dashboard reachability is confirmed; full admin checklist still requires secure test evidence. |

Overall result: Partially passed. Custom-domain portal routing and CORS blockers are resolved; mobile QA and full secure role-flow evidence are still pending.

## Live Staging Evidence

### Public Website

| Check | Evidence | Result |
|---|---|---|
| `https://www.karigo.com.ng` | `HTTP/1.1 200 OK`, Vercel, valid SSL header | Passed |
| `https://karigo.com.ng` | `HTTP/1.1 200 OK`, Vercel, valid SSL header | Passed |
| `/vendors` | `HTTP/1.1 200 OK`, matched path `/vendors` | Passed |
| `/riders` | `HTTP/1.1 200 OK`, matched path `/riders` | Passed |
| `/contact` | `HTTP/1.1 200 OK`, matched path `/contact` | Passed |
| `/vendors/apply` | `HTTP/1.1 200 OK`, matched path `/vendors/apply` | Passed |
| `/privacy` | `HTTP/1.1 200 OK`, matched path `/privacy` | Passed |
| `/terms` | `HTTP/1.1 200 OK`, matched path `/terms` | Passed |
| Readiness copy | Homepage marks Taxi and Bills as coming soon, Pharmacy as preparing launch | Passed |

### Backend API

| Check | Endpoint | Evidence | Result |
|---|---|---|---|
| Health | `GET /api/v1/health` | `success: true`, message `KariGO API is healthy`, service `backend-api`, status `ok` | Passed |
| API base path | `GET /api/v1` | `NOT_FOUND` is expected for the API prefix root; use `/api/v1/health` for health checks | Passed |
| Swagger | `GET /api/docs` | `HTTP/1.1 200 OK`, `content-type: text/html` | Passed |
| Unauthorized protection | `GET /api/v1/auth/me` without token | `401 Unauthorized`, error code `UNAUTHORIZED` | Passed |
| Public vendors | `GET /api/v1/vendors` | Returned Kano Everyday Market, Kano Fresh Mart and Kano Kitchen | Passed |
| Public products | `GET /api/v1/products` | Returned Food, Grocery and Market products with vendor names and product categories | Passed |
| Discovery home | `GET /api/v1/discovery/home` | Returned categories; Pharmacy `enabled: false`; Food/Grocery/Market/Parcel/SME enabled | Passed |
| Utilities providers | `GET /api/v1/utilities/providers` | Returned demo Airtime, Data, Electricity and Cable TV providers | Passed for test mode |

### Portal Reachability

| Portal URL | Expected | Observed | Result |
|---|---|---|---|
| `https://admin.karigo.com.ng` | Admin Portal | Admin Portal loads correctly; authenticated dashboard reachability confirmed | Passed |
| `https://karigo-admin-portal.vercel.app` | Admin Portal | `HTTP/1.1 200 OK` | Passed |
| `https://vendor.karigo.com.ng` | Vendor Dashboard | Vendor Dashboard loads correctly; authenticated dashboard reachability confirmed | Passed |
| `https://karigo-vendor-dashboard.vercel.app` | Vendor Dashboard | Page title `KariGO Vendor Dashboard` | Passed |

### Backend CORS Preflight

Request tested: `OPTIONS /api/v1/auth/login` with `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: content-type,authorization`.

| Origin | Observed | Result |
|---|---|---|
| `https://www.karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://www.karigo.com.ng` | Passed |
| `https://karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://karigo.com.ng` | Passed |
| `https://karigo-admin-portal.vercel.app` | `204 No Content`, `access-control-allow-origin: https://karigo-admin-portal.vercel.app` | Passed |
| `https://karigo-vendor-dashboard.vercel.app` | `204 No Content`, `access-control-allow-origin: https://karigo-vendor-dashboard.vercel.app` | Passed |
| `https://admin.karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://admin.karigo.com.ng` | Passed |
| `https://vendor.karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://vendor.karigo.com.ng` | Passed |

## Credentialed Role QA Status

The following checklist areas require secure demo passwords and, for mobile, installed staging APKs or approved test devices:

| Role surface | Checklist | Status | Blocker |
|---|---|---|---|
| Customer App | `customer-app-role-test-checklist.md` | Not executed in this pass | Secure demo password and test device session not supplied |
| Rider App | `rider-app-role-test-checklist.md` | Not executed in this pass | Secure demo password and rider staging APK/device session not supplied |
| Vendor Dashboard | `vendor-dashboard-role-test-checklist.md` | Partially executed externally | Authenticated branded-domain dashboard reachability is confirmed; full checklist evidence still pending |
| Admin Portal | `admin-portal-role-test-checklist.md` | Partially executed externally | Authenticated branded-domain dashboard reachability is confirmed; full checklist evidence still pending |

Do not record demo passwords in Git. Use the staging secret manager or approved internal vault when executing manual role QA.

## Local Validation Results

| Validation | Result |
|---|---|
| Backend typecheck: `npm run typecheck --workspace @karigo/backend-api` | Passed |
| Customer App typecheck: `npm run typecheck --workspace @karigo/customer-app` | Passed |
| Rider App typecheck: `npm run typecheck --workspace @karigo/rider-app` | Passed |
| Vendor Dashboard typecheck: `npm run typecheck --workspace @karigo/vendor-dashboard` | Passed |
| Admin Portal typecheck: `npm run typecheck --workspace @karigo/admin-portal` | Passed |
| Website typecheck: `npm run typecheck --workspace @karigo/website` | Passed |
| Vendor Dashboard build: `npm run build --workspace @karigo/vendor-dashboard` | Passed |
| Admin Portal build: `npm run build --workspace @karigo/admin-portal` | Passed |
| Website build: `npm run build --workspace @karigo/website` | Passed |

## QA Conclusion

KariGO staging is healthy at the backend/API and public website level, and public discovery/catalogue data is available. The branded Admin and Vendor domains are now usable, and backend CORS allows both branded portal origins.

Recommended release status:

- Internal demo using branded Admin/Vendor portals: Ready for continued management review.
- Custom-domain management/vendor demo: Ready from a routing and CORS perspective.
- Controlled soft launch: Not ready until mobile QA and full credentialed end-to-end role QA are executed and signed off.
