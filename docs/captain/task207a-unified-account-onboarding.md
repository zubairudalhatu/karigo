# Task 207A - Unified Customer-To-Captain Account Onboarding

## Root Cause

The Captain app accepted both `RIDER` and `CUSTOMER` accounts at login, but immediately routed every authenticated account to `/tabs/dashboard`.

The dashboard then called approved-Captain operational APIs such as `/riders/me`, assigned delivery jobs, and operational notifications. A signed-in Customer applicant correctly received `403 Forbidden` from those rider-only APIs. The shared API client treated `403` like `401`, so the Captain app cleared access and refresh tokens and returned the user to login.

## 401 Versus 403 Policy

`401 Unauthorized` means the saved session is invalid or expired. The shared API client may attempt refresh once, then invoke the unauthorised/session-clear flow if refresh fails.

`403 Forbidden` means the user is authenticated but does not have permission for that capability. The shared client now throws a structured `KariGoApiError` and does not clear tokens by default.

Backend account-wide security states such as deleted, suspended, blocked, or deactivated accounts remain enforced by JWT validation and refresh-session checks as authentication failures.

## Unified Account Model

Task 207A keeps one KariGO `User` identity:

- Existing Customer account credentials can sign in to the Captain app.
- The Customer account remains usable in the Customer app.
- Delivery Captain and Ride Captain access are projected from application records and approved profile records.
- No duplicate phone, wallet, password, refresh-token, or User row is created.
- `User.role` is not overwritten merely because a Customer starts Captain onboarding.

## Captain Access Resolver

Backend endpoint:

```text
GET /api/v1/captain/access
```

The endpoint is JWT-protected and returns safe account/access projection only:

- account ID, role, lifecycle status, name, phone, email
- supported onboarding modes
- Delivery Captain application summary
- Ride Captain application summary
- approved Delivery Captain profile summary
- approved Ride Captain profile summary
- operational modes
- `nextStep`
- `nextRoute`

It does not return password hashes, refresh tokens, bank data, private document links, internal review notes, or another applicant's data.

## Route Decision Table

| Account state | Next step | App route |
| --- | --- | --- |
| Existing Customer with no Captain application | `START_APPLICATION` | `/auth/apply` |
| Customer or Rider with pending/review application | `APPLICATION_STATUS` | `/tabs/dashboard` applicant home |
| Rejected/revision application | `APPLICATION_STATUS` | `/tabs/dashboard` applicant home |
| Approved Delivery Captain profile | `OPEN_DASHBOARD` | `/tabs/dashboard` operational home |
| Approved Ride Captain profile | `OPEN_DASHBOARD` | `/tabs/dashboard` with Ride operations entry |
| Approved for both | `OPEN_DASHBOARD` | `/tabs/dashboard` with both operational modes |

The Captain app now routes successful login and biometric sign-in to `/captain-access`, shows `Preparing your KariGO Captain access...`, resolves the backend projection, then replaces to the safe next route.

## Existing-Account Flow

When public Captain onboarding sees a phone number that belongs to an existing Customer, the backend returns `SIGN_IN_REQUIRED` and does not issue an account-creation OTP.

The Captain app stores the selected Captain application intent locally and shows `Sign in to continue`. After sign-in, the resolver returns the user to the application route if no application exists, and the form pre-fills name, verified phone number, email, and the previously selected Captain mode.

## New-Account OTP Flow

For an unused Captain applicant phone number:

1. Create a pending Captain applicant account.
2. Send OTP.
3. Verify OTP.
4. Create password.
5. Continue Captain application.

This remains separate from existing Customer sign-in. OTPs are not requested for an already verified Customer account.

## Application Ownership

Current-user application endpoints derive identity from the JWT:

```text
POST /delivery-captain-applications/me
GET /delivery-captain-applications/me
POST /taxi/driver-applications/me
GET /taxi/driver-applications/me
```

They use the authenticated User ID and verified account phone number, reject body phone mismatches, preserve ownership, and return existing active applications instead of creating duplicates.

## Operational Access

The Captain dashboard now calls `/captain/access` first.

Delivery operational APIs are called only when `operationalModes` contains `DELIVERY_CAPTAIN`.

Ride operations are exposed only when the resolver projects approved Ride access. Ride dispatch, ride payments, and payout automation remain disabled unless separately approved by operations configuration.

## Tests And Validation

Expected validation:

- Prisma validate/generate
- backend typecheck/build
- focused auth/riders/taxi tests
- full backend tests
- shared API-client regression
- Captain typecheck/regression
- Customer, Partner, Admin and Vendor auth-surface typechecks/regressions where changed
- Admin and Vendor builds where changed
- Expo config and Expo Doctor
- secret scan
- artifact URL scan
- git diff checks

## Deployment

Required:

- Render backend redeploy for `/captain/access` and resolver tests.
- Captain production OTA for JavaScript routing/session/dashboard changes.

Not required:

- Prisma migration, because no schema changed.
- Fresh Captain AAB, because no native dependency or app config changed.
- Google Play upload.

Customer, Partner, Admin and Vendor code paths received the 401/403 semantic hardening. Deploy those surfaces on their normal release cadence if the safer behavior is desired immediately outside the Captain app.

## Rollback

If a production issue appears:

1. Roll back the backend deploy to the previous Render build.
2. Publish the previous Captain OTA group or build.
3. Confirm Customer login remains unaffected.
4. Re-run `/auth/login`, `/auth/me`, `/captain/access`, and Captain dashboard smoke checks before retrying.

## Real-Device Acceptance

Existing Customer account:

1. Keep Captain app versionCode 9 installed.
2. Apply the Captain OTA.
3. Sign in with the controlled existing Customer account.
4. Confirm login does not return to login.
5. Confirm the account remains signed in after force close/reopen.
6. Confirm name, phone, and email are pre-filled.
7. Confirm no account-creation OTP is requested.
8. Submit Delivery Captain, Ride Captain, or both.
9. Confirm application status is shown.
10. Confirm the same credentials still work in the Customer app.

Forbidden operational access:

1. Leave the Customer application unapproved.
2. Open Deliveries, Earnings, Profile, and Home.
3. Confirm approval-required messaging appears.
4. Confirm the session remains signed in.

Approved account:

1. Approve a controlled application in Admin.
2. Refresh Captain access.
3. Confirm the operational dashboard appears.
4. Confirm only approved operational modes are available.

Acceptance remains pending until the real device proves an existing Customer can continue Captain onboarding without a duplicate account and without being logged out.
