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
| Public website content | Passed | Food, groceries, market, parcel and SME errands shown as live; Taxi, Bills and Pharmacy are clearly gated. |
| Admin portal fallback | Passed | `karigo-admin-portal.vercel.app` returned Admin Portal HTML. |
| Vendor dashboard fallback | Passed | `karigo-vendor-dashboard.vercel.app` returned Vendor Dashboard HTML. |
| Admin custom domain | Partially passed | Domain loads Admin Portal, but backend CORS did not echo `access-control-allow-origin` for `https://admin.karigo.com.ng`. |
| Vendor custom domain | Failed | `https://vendor.karigo.com.ng` served Admin Portal HTML instead of Vendor Dashboard HTML. |
| Vendor custom-domain API CORS | Failed | Backend preflight did not echo `access-control-allow-origin` for `https://vendor.karigo.com.ng`. |
| Public vendor/product discovery | Passed | Active food, grocery and market vendors/products returned. |
| Bills & Utilities catalogue | Passed for test catalogue | Demo utility providers returned; live fulfilment remains intentionally inactive. |
| Protected endpoint guard | Passed | `GET /auth/me` without token returned `401 Unauthorized`. |
| Customer App role QA | Blocked for live credentialed run | Requires secure demo password and Android/iOS test session. Static config/build validation passed. |
| Rider App role QA | Blocked for live credentialed run | Requires secure demo password and Android test session. Static config/build validation passed. |
| Vendor Dashboard credentialed QA | Blocked for live role run | Requires secure demo password. Fallback domain loads; custom domain currently misroutes. |
| Admin Portal credentialed QA | Blocked for live role run | Requires secure demo password. Fallback domain loads; custom-domain CORS requires update before custom-domain operations. |

Overall result: Partially passed, with deployment issues blocking custom-domain portal readiness and credentialed role QA still pending.

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
| Swagger | `GET /api/docs` | `HTTP/1.1 200 OK`, `content-type: text/html` | Passed |
| Unauthorized protection | `GET /api/v1/auth/me` without token | `401 Unauthorized`, error code `UNAUTHORIZED` | Passed |
| Public vendors | `GET /api/v1/vendors` | Returned Kano Everyday Market, Kano Fresh Mart and Kano Kitchen | Passed |
| Public products | `GET /api/v1/products` | Returned Food, Grocery and Market products with vendor names and product categories | Passed |
| Discovery home | `GET /api/v1/discovery/home` | Returned categories; Pharmacy `enabled: false`; Food/Grocery/Market/Parcel/SME enabled | Passed |
| Utilities providers | `GET /api/v1/utilities/providers` | Returned demo Airtime, Data, Electricity and Cable TV providers | Passed for test mode |

### Portal Reachability

| Portal URL | Expected | Observed | Result |
|---|---|---|---|
| `https://admin.karigo.com.ng` | Admin Portal | Page title `KariGO Admin Portal` | Passed for page load |
| `https://karigo-admin-portal.vercel.app` | Admin Portal | `HTTP/1.1 200 OK` | Passed |
| `https://vendor.karigo.com.ng` | Vendor Dashboard | Page title `KariGO Admin Portal` | Failed |
| `https://karigo-vendor-dashboard.vercel.app` | Vendor Dashboard | Page title `KariGO Vendor Dashboard` | Passed |

### Backend CORS Preflight

Request tested: `OPTIONS /api/v1/auth/login` with `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: content-type,authorization`.

| Origin | Observed | Result |
|---|---|---|
| `https://www.karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://www.karigo.com.ng` | Passed |
| `https://karigo.com.ng` | `204 No Content`, `access-control-allow-origin: https://karigo.com.ng` | Passed |
| `https://karigo-admin-portal.vercel.app` | `204 No Content`, `access-control-allow-origin: https://karigo-admin-portal.vercel.app` | Passed |
| `https://karigo-vendor-dashboard.vercel.app` | `204 No Content`, `access-control-allow-origin: https://karigo-vendor-dashboard.vercel.app` | Passed |
| `https://admin.karigo.com.ng` | `204 No Content`, no `access-control-allow-origin` header echoed | Failed |
| `https://vendor.karigo.com.ng` | `204 No Content`, no `access-control-allow-origin` header echoed | Failed |

## Credentialed Role QA Status

The following checklist areas require secure demo passwords and, for mobile, installed staging APKs or approved test devices:

| Role surface | Checklist | Status | Blocker |
|---|---|---|---|
| Customer App | `customer-app-role-test-checklist.md` | Not executed in this pass | Secure demo password and test device session not supplied |
| Rider App | `rider-app-role-test-checklist.md` | Not executed in this pass | Secure demo password and rider staging APK/device session not supplied |
| Vendor Dashboard | `vendor-dashboard-role-test-checklist.md` | Not executed in this pass | Secure demo password not supplied; custom domain misroutes |
| Admin Portal | `admin-portal-role-test-checklist.md` | Not executed in this pass | Secure demo password not supplied; custom-domain CORS missing |

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

KariGO staging is healthy at the backend/API and public website level, and public discovery/catalogue data is available. The Vercel fallback portals are reachable. However, custom-domain portal readiness is not complete because `vendor.karigo.com.ng` is currently routed to the Admin Portal and backend CORS does not allow the admin/vendor custom domains.

Recommended release status:

- Internal demo using Vercel fallback portals: Conditionally ready after secure demo credentials are confirmed.
- Custom-domain management/vendor demo: Not ready until portal DNS/Vercel mapping and backend CORS are fixed.
- Controlled soft launch: Not ready until credentialed end-to-end role QA is executed and signed off.
