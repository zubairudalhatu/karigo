# Portal BFF Session Architecture - Task 206A

## Scope

Task 206A moves Admin Portal and Partner Workspace authentication away from browser-readable JWT storage.

The browser now talks to same-origin BFF routes:

- Admin Portal: `/api/bff/*`
- Partner Workspace: `/api/bff/*`

The BFF routes call the backend API server-side and hold backend access/refresh tokens in `HttpOnly` cookies.

## Security Model

- Browser code no longer stores access or refresh JWTs in `localStorage` or `sessionStorage`.
- Access and refresh tokens are set as `HttpOnly` cookies by the portal BFF route.
- Portal requests include a readable CSRF cookie value as the `x-karigo-csrf` header.
- Unsafe methods require allowed `Origin` or `Referer` plus a matching CSRF header.
- Login and vendor activation responses are sanitized before returning to the browser so token fields are not exposed.
- Session refresh happens server-side through the BFF route.
- Logout sends the refresh token to the backend from the HttpOnly cookie and then clears portal cookies.
- Admin sessions are role-gated to `ADMIN`.
- Partner Workspace sessions are role-gated to `VENDOR`.

## Environment Variables

Portal hosting should configure these variable names only. Do not paste secrets into documentation.

- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_PORTAL_ORIGIN`
- `NEXT_PUBLIC_ADMIN_PORTAL_ORIGIN`
- `VENDOR_PORTAL_ORIGIN`
- `NEXT_PUBLIC_VENDOR_PORTAL_ORIGIN`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `SESSION_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_SECONDS`

Backend hosting should keep an explicit credentialed CORS allowlist:

- `CORS_ORIGINS`

Expected origins include the public Admin Portal, public Partner Workspace, approved staging domains, and local development origins when needed.

## Deployment Notes

Deploy all changed services together for Task 206A:

- Backend API, because credentialed CORS behavior changed.
- Admin Portal, because auth now routes through the Admin BFF.
- Partner Workspace, because auth/uploads now route through the Partner BFF.

No Prisma migration is required for Task 206A.

## Smoke Checks

After deployment:

1. Open Admin Portal and confirm login succeeds.
2. Confirm Admin refresh after page reload still shows the logged-in admin.
3. Confirm Admin logout clears the session.
4. Open Partner Workspace and confirm login succeeds.
5. Confirm Partner refresh after page reload still shows the logged-in partner.
6. Upload a partner product/profile/onboarding file and confirm it uses the BFF route.
7. Check browser dev tools Application storage and confirm no KariGO JWT appears in local/session storage.
8. Confirm backend rejects requests from origins not listed in `CORS_ORIGINS`.

## Rollback Plan

If portal login is blocked after deployment:

1. Verify `API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` points to the backend API base URL.
2. Verify portal origins are present in `CORS_ORIGINS`.
3. Verify `ADMIN_PORTAL_ORIGIN` and `VENDOR_PORTAL_ORIGIN` match the deployed portal origins.
4. Temporarily redeploy the previous portal and backend commits if login cannot be restored quickly.
5. Do not reintroduce browser-readable JWT storage without a separate security review.
