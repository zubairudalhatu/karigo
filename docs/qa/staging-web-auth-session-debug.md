# Staging Web Auth Session Debug

## Context

Staging services:

- Backend API: `https://karigo-8htn.onrender.com/api/v1`
- Admin Portal: `https://karigo-admin-portal.vercel.app`
- Vendor Dashboard: `https://karigo-vendor-dashboard.vercel.app`

Observed issue:

- Login attempts on both Vercel portals showed `Your session has expired. Please sign in again.`
- Dashboard pages did not load after login attempts.

No live providers, credentials, or business rules were changed for this fix.

## Backend Auth Contract

### `POST /api/v1/auth/login`

Request:

```json
{
  "phoneNumber": "+2348000000000",
  "password": "<password>"
}
```

Phone input is transformed through the backend Nigerian phone normalizer before
validation. Supported formats include `080...`, `234...`, and `+234...` when they
represent a valid Nigerian mobile number.

Successful response data:

```json
{
  "user": {
    "id": "<user-id>",
    "fullName": "<name>",
    "phoneNumber": "+234...",
    "role": "ADMIN",
    "adminRole": "SUPER_ADMIN"
  },
  "accessToken": "<jwt>"
}
```

### `GET /api/v1/auth/me`

Requires:

```http
Authorization: Bearer <accessToken>
```

The JWT payload contains `sub` and `role`. The backend verifies the token with
`JWT_SECRET`, checks expiry, loads the user, and rejects deleted/inactive users.

## Root Cause

The shared web API client called the unauthorized handler for any `401`, including
unauthenticated login failures. The portal error mapper also displayed every `401` as
`Your session has expired. Please sign in again.`

That made normal login failures, missing tokens during first page load, and real expired
sessions look identical.

## Fix Applied

- Login requests no longer trigger the stale-session handler.
- Protected requests clear stored tokens only after confirmed `401` or `403`.
- Auth bootstrap skips `/auth/me` when no token exists.
- Admin and vendor portals store tokens under separate localStorage keys.
- Login error messages now distinguish invalid credentials from expired sessions.
- Nigerian phone number input is normalized before login requests.
- Non-auth API failures now use dashboard-load messages instead of session-expired copy.

## CORS Expectations

Backend staging must allow:

- `https://karigo-admin-portal.vercel.app`
- `https://karigo-vendor-dashboard.vercel.app`

Protected requests require:

- `Authorization` request header
- `Content-Type: application/json`
- `Accept: application/json`
- OPTIONS preflight support

The web portals use bearer tokens in localStorage and do not require cookie credentials
for staging authentication.

## Verification Checklist

| Check | Expected result | Status |
| --- | --- | --- |
| Backend health | `/api/v1/health` responds successfully | Confirm before redeploy test |
| Admin login | Admin user signs in and lands on dashboard | Pending Vercel redeploy |
| Vendor login | Vendor user signs in and lands on dashboard | Pending Vercel redeploy |
| Wrong password | Shows invalid phone/password copy | Pending Vercel redeploy |
| Expired token | Clears token and redirects/signs out | Pending Vercel redeploy |
| Server 500 | Shows dashboard load error, not session-expired copy | Pending Vercel redeploy |
| CORS | Vercel origins can call backend with Authorization | Confirm in browser network tab |

## Likely Remaining Failure Causes

- Vercel deployment has not been redeployed after this commit.
- Render `CORS_ORIGINS` does not include both Vercel origins.
- Staging seed password does not match the password being tested.
- Staging seed did not complete.
- Role mismatch, for example using a customer account on the vendor dashboard.
