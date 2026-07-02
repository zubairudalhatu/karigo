# Staging Demo Login Verification

Use this checklist after running the staging demo credential reset. Do not record
passwords, bearer tokens, screenshots containing secrets, or personal data in Git.

## Environment

| Item | Value |
| --- | --- |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Admin Portal | `https://karigo-admin-portal.vercel.app` |
| Vendor Dashboard | `https://karigo-vendor-dashboard.vercel.app` |
| Providers | Mock providers only |

## Demo Accounts

Passwords must come from the secure staging handover channel.

| Persona | Login phone | Expected role | Surface |
| --- | --- | --- | --- |
| Super Admin | `SUPER_ADMIN_PHONE`, or seed fallback phone if not overridden | `ADMIN` | Admin Portal |
| Operations Admin | `+2348000000001` | `ADMIN` | Admin Portal |
| Demo Vendor Owner | `+2348000000101` | `VENDOR` | Vendor Dashboard |
| Demo Rider | `+2348000000401` | `RIDER` | Rider App |
| Demo Customer | `+2348000000201` | `CUSTOMER` | Customer App |

## Pre-Login Checks

| Check | Expected result | Status |
| --- | --- | --- |
| Backend health | `/health` endpoint returns healthy response | Pending |
| Seed reset output | `Credential reset applied: yes` for the one reset run | Pending |
| Reset disabled after seed | `STAGING_RESET_DEMO_CREDENTIALS` removed or set to `false` | Pending |
| Admin portal API URL | Uses staging backend API URL | Pending |
| Vendor dashboard API URL | Uses staging backend API URL | Pending |
| CORS | Backend allows both Vercel origins | Pending |

## Admin Login Test

1. Open `https://karigo-admin-portal.vercel.app/login`.
2. Clear site data or use an incognito/private browser window.
3. Enter the Super Admin or Operations Admin login phone.
4. Enter the staging password from the secure handover channel.
5. Submit the form.
6. Expected result: the portal redirects to the Admin dashboard.
7. In browser devtools, confirm protected requests use:

```http
Authorization: Bearer <token>
```

Do not copy or store the token value.

## Vendor Login Test

1. Open `https://karigo-vendor-dashboard.vercel.app/login`.
2. Clear site data or use an incognito/private browser window.
3. Enter the Demo Vendor Owner login phone.
4. Enter the staging password from the secure handover channel.
5. Submit the form.
6. Expected result: the dashboard redirects to the Vendor overview/orders area.
7. In browser devtools, confirm protected requests use:

```http
Authorization: Bearer <token>
```

Do not copy or store the token value.

## Expected Failure Messages

| Scenario | Expected message |
| --- | --- |
| Wrong phone/password | `Invalid phone number or password.` |
| Wrong role for portal | Account cannot use that portal |
| Expired/stale token | `Your session has expired. Please sign in again.` |
| Non-auth dashboard error | Dashboard load error, not session-expired copy |

## If Login Still Fails

- Confirm the reset seed command ran against the staging database.
- Confirm the active password is the value stored in Render, not a local value.
- Confirm the user role matches the portal being tested.
- Confirm the Vercel portal was redeployed after Task 39.
- Confirm Render `CORS_ORIGINS` includes both Vercel portal origins.
- Confirm `STAGING_RESET_DEMO_CREDENTIALS` has been turned off after the reset.
