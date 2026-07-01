# Frontend Authentication Integration Plan

## Customer Flow

1. Submit `fullName`, `phoneNumber`, optional email, and password to `/auth/customer/register`.
2. In local development, read the returned mock OTP; never expose it in production.
3. Submit phone number and OTP to `/auth/verify-otp`.
4. Submit phone number and password to `/auth/login`.
5. Store the JWT using the platform token adapter and load `/auth/me`.

Vendor, rider, and admin users use the login and identity endpoints with role-specific seeded/provisioned accounts.

## Token Storage

- Customer/rider Expo apps: implement a `TokenStore` with Expo SecureStore before integration.
- Vendor/admin web: prefer secure HTTP-only cookies and server-side route checks. A local-storage adapter may be used only as a short-lived development step.
- Never log tokens or include them in query strings.
- Clear token and cached user data on logout.

## Route Protection

- Mobile: use protected Expo Router groups and redirect unauthenticated users to login.
- Web: use middleware/server layouts once cookie sessions are available; also guard client-side navigation.
- Compare `/auth/me` role with the app surface. A customer token must not open rider, vendor, or admin UI.
- Backend role guards remain authoritative.

## Expiry And Errors

- The shared client adds `Authorization: Bearer <token>` and normalizes API errors.
- On HTTP 401, clear the session and return to login.
- On HTTP 403, show an access-denied state without retry loops.
- Show validation details near the affected fields.
- Treat network failures as retryable; do not retry non-idempotent requests automatically.
- Preserve intended destination during re-authentication where safe.
