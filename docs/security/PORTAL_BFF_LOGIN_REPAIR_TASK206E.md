# Portal BFF Login Repair - Task 206E

Task 206E repairs the production Admin Portal and Partner Workspace login handoff after Task 206A moved browser sessions to same-origin BFF routes and HttpOnly cookies.

## Root Cause

The BFF session layer correctly stripped `accessToken`, `refreshToken` and `refreshTokenId` from backend login responses before returning data to browser JavaScript.

The Admin Portal and Partner Workspace auth contexts still treated `result.accessToken` as mandatory. A successful secure BFF login therefore failed in the browser with:

> We could not sign you in. Please try again.

The fix keeps tokens out of browser-readable responses and accepts the sanitized `user` profile after the BFF has set HttpOnly session cookies.

Backend login also now returns safe 403 state messages when a caller supplies the correct password for a non-active account, such as pending Partner approval or suspended account status. Invalid passwords still return the generic invalid-credentials message.

## Routes

- Admin login page: `https://admin.karigo.com.ng/login`
- Admin BFF route: `/api/bff/auth/login`
- Partner login page: `https://vendor.karigo.com.ng/login`
- Partner BFF route: `/api/bff/auth/login`
- Backend endpoint used by both BFF routes: `POST /api/v1/auth/login`
- Backend refresh endpoint used by both BFF routes: `POST /api/v1/auth/refresh`
- Backend logout endpoint used by both BFF routes: `POST /api/v1/auth/logout`

## Session And Cookie Behaviour

- Access token cookie: `karigo_admin_access` or `karigo_vendor_access`
- Refresh token cookie: `karigo_admin_refresh` or `karigo_vendor_refresh`
- CSRF cookie: `karigo_admin_csrf` or `karigo_vendor_csrf`
- Access and refresh cookies are `HttpOnly`.
- Cookies are `Secure` outside local development.
- Cookies use `SameSite=Lax` by default, or `Strict` when `COOKIE_SAME_SITE=strict`.
- Cookies are scoped to `Path=/`.
- No cookie domain is configured in source, so production cookies are host-only.
- Admin and Partner Workspace cookie names are isolated and cannot overwrite each other.

## CSRF Behaviour

- Login remains a public auth path and does not require an existing CSRF token.
- State-changing authenticated requests require:
  - an allowed `Origin` or `Referer`; and
  - a matching readable CSRF cookie and `x-karigo-csrf` header.
- Missing or invalid CSRF returns `CSRF_TOKEN_REJECTED`.
- Unknown origins return `CSRF_ORIGIN_REJECTED`.

## Environment Matrix

| Variable | Application | Platform | Scope | Production required | Redeploy required after change |
| --- | --- | --- | --- | --- | --- |
| `API_BASE_URL` | Admin Portal BFF | Admin Vercel | Server-only | Yes, unless `NEXT_PUBLIC_API_BASE_URL` is set | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Admin Portal BFF compatibility | Admin Vercel | Public-compatible legacy fallback | Yes, unless `API_BASE_URL` is set | Yes |
| `ADMIN_PORTAL_ORIGIN` | Admin Portal BFF | Admin Vercel | Server-only | Recommended | Yes |
| `NEXT_PUBLIC_ADMIN_PORTAL_ORIGIN` | Admin Portal BFF compatibility | Admin Vercel | Public-compatible fallback | Optional if `ADMIN_PORTAL_ORIGIN` is set | Yes |
| `COOKIE_SECURE` | Admin Portal BFF | Admin Vercel | Server-only | Optional; should not be `false` in production | Yes |
| `COOKIE_SAME_SITE` | Admin Portal BFF | Admin Vercel | Server-only | Optional; defaults to `lax` | Yes |
| `SESSION_TTL_SECONDS` | Admin Portal BFF | Admin Vercel | Server-only | Optional | Yes |
| `REFRESH_TOKEN_TTL_SECONDS` | Admin Portal BFF | Admin Vercel | Server-only | Optional | Yes |
| `API_BASE_URL` | Partner Workspace BFF | Vendor Vercel | Server-only | Yes, unless `NEXT_PUBLIC_API_BASE_URL` is set | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Partner Workspace BFF compatibility | Vendor Vercel | Public-compatible legacy fallback | Yes, unless `API_BASE_URL` is set | Yes |
| `VENDOR_PORTAL_ORIGIN` | Partner Workspace BFF | Vendor Vercel | Server-only | Recommended | Yes |
| `NEXT_PUBLIC_VENDOR_PORTAL_ORIGIN` | Partner Workspace BFF compatibility | Vendor Vercel | Public-compatible fallback | Optional if `VENDOR_PORTAL_ORIGIN` is set | Yes |
| `COOKIE_SECURE` | Partner Workspace BFF | Vendor Vercel | Server-only | Optional; should not be `false` in production | Yes |
| `COOKIE_SAME_SITE` | Partner Workspace BFF | Vendor Vercel | Server-only | Optional; defaults to `lax` | Yes |
| `SESSION_TTL_SECONDS` | Partner Workspace BFF | Vendor Vercel | Server-only | Optional | Yes |
| `REFRESH_TOKEN_TTL_SECONDS` | Partner Workspace BFF | Vendor Vercel | Server-only | Optional | Yes |
| `CORS_ORIGINS` | Backend API | Render | Server-only | Yes | Yes |

Production `CORS_ORIGINS` must include:

- `https://admin.karigo.com.ng`
- `https://vendor.karigo.com.ng`

Do not commit environment values, cookies, tokens or credentials.

## Live Non-Secret Checks

On July 28, 2026:

- `GET https://karigo-8htn.onrender.com/api/v1/health` returned healthy.
- Backend preflight from `https://admin.karigo.com.ng` returned `access-control-allow-origin: https://admin.karigo.com.ng`.
- Backend preflight from `https://vendor.karigo.com.ng` returned `access-control-allow-origin: https://vendor.karigo.com.ng`.
- `GET /api/bff/auth/me` on both portals returned `401` and cleared the correct portal cookies, confirming the BFF route is deployed and cookie clearing works.
- Empty-body `POST /api/bff/auth/login` reached backend validation through both BFFs, confirming the BFF routes can reach the backend.

## Deployment Steps

1. Redeploy Admin Portal to Vercel Production.
2. Redeploy Partner Workspace to Vercel Production.
3. Confirm both deployments have `API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` set to the backend API base URL.
4. Confirm backend `CORS_ORIGINS` still includes both branded portal origins.
5. Test Admin login in a new/incognito browser session.
6. Test Partner Workspace login in a new/incognito browser session.
7. Confirm refresh after page reload.
8. Confirm logout clears the portal session.
9. Confirm browser `localStorage` and `sessionStorage` do not contain KariGO JWTs.
10. Confirm a pending Partner account shows the awaiting-approval state and a suspended account shows the support message.

## Rollback

If login remains blocked after redeploy:

1. Check Vercel function logs for `BFF_BACKEND_UNAVAILABLE`, `BFF_BACKEND_NON_JSON`, `BFF_SESSION_USER_MISSING`, `CSRF_ORIGIN_REJECTED` or `PORTAL_ROLE_REJECTED`.
2. Confirm the BFF production backend URL variable points to `https://karigo-8htn.onrender.com/api/v1`.
3. Confirm the credentialed backend preflight still echoes the exact portal origin.
4. Clear stale cookies for the affected portal host and retest.
5. Do not reintroduce browser-readable JWT storage.
