# Vendor Dashboard Auth Notes

## Backend Contract

Vendor Dashboard login calls:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Successful login data must include:

- `accessToken`
- `user.role`

Protected requests use:

```http
Authorization: Bearer <accessToken>
```

## Token Storage

The Vendor Dashboard stores its token under:

```text
karigo_vendor_access_token
```

This key is separate from the Admin Portal token key.

## Role Validation

Only users with:

```text
role = VENDOR
```

can enter the Vendor Dashboard. Non-vendor users are rejected before the token is
persisted.

## Session Handling

- Auth bootstrap checks localStorage first.
- If no token exists, `/auth/me` is not called.
- Stored tokens are cleared only after confirmed `401` or `403` from protected requests.
- Login failures do not trigger the stale-session handler.
- Non-auth dashboard errors should show a dashboard-load message.

## Phone Number Handling

The login flow normalizes common Nigerian phone formats before sending the request:

- `080...`
- `234...`
- `+234...`

## Staging Verification

1. Deploy the latest Vendor Dashboard commit to Vercel.
2. Confirm `NEXT_PUBLIC_API_BASE_URL` is
   `https://karigo-8htn.onrender.com/api/v1`.
3. Open `https://karigo-vendor-dashboard.vercel.app/login`.
4. Log in with the seeded vendor owner account and the secure staging password.
5. Confirm the dashboard loads and protected API calls include a bearer token.
