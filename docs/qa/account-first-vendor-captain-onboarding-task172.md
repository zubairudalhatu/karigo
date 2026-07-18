# Task 172 Account-First Vendor and Captain Onboarding QA

## Scope

This record verifies the account-first onboarding flow for:

- Vendor applicants
- Delivery Captain applicants
- Ride Captain applicants

The flow is limited to Kano and Abuja launch onboarding. It does not activate live payments, live rides, payouts, wallet automation, public provider login or production publishing.

## Expected Flow

1. Applicant creates an account with name, Nigerian phone number and optional email.
2. Backend normalizes the phone number and sends an OTP.
3. Applicant verifies OTP.
4. Applicant creates a password.
5. Applicant submits application details and document metadata/secure URLs.
6. Backend links the application to the verified applicant account.
7. Admin reviews the application.
8. Approval links the same account into Vendor or Captain login readiness, while operational controls remain separate.

## Public Website Checks

| Surface | Expected result | Status |
| --- | --- | --- |
| `/vendors/apply` | Shows account-first vendor flow before business details | Pending post-deploy verification |
| `/riders#delivery-captain-application` | Shows account-first Delivery Captain flow before application details | Pending post-deploy verification |
| `/riders#ride-captain-application` | Shows account-first Ride Captain flow before vehicle details | Pending post-deploy verification |
| Ride waitlist | Remains interest-only and does not require account setup | Pending post-deploy verification |

## Backend Endpoint Checks

Vendor onboarding:

- `POST /api/v1/auth/vendor-onboarding/account`
- `POST /api/v1/auth/vendor-onboarding/verify-otp`
- `POST /api/v1/auth/vendor-onboarding/resend-otp`
- `POST /api/v1/auth/vendor-onboarding/password`
- `GET /api/v1/auth/vendor-onboarding/status`
- `POST /api/v1/vendor-applications`

Captain onboarding:

- `POST /api/v1/auth/captain-onboarding/account`
- `POST /api/v1/auth/captain-onboarding/verify-otp`
- `POST /api/v1/auth/captain-onboarding/resend-otp`
- `POST /api/v1/auth/captain-onboarding/password`
- `GET /api/v1/auth/captain-onboarding/status`
- `POST /api/v1/delivery-captain-applications`
- `POST /api/v1/taxi/driver-applications`

## Admin Review Checks

Admin Portal should show:

- Linked applicant account status
- Phone verified or OTP pending
- Password created or password pending
- Submitted document metadata links
- Vendor account link after vendor approval
- Captain profile readiness after Captain approval

Admin Portal must not expose:

- OTP values
- Passwords
- Payment secrets
- Keystores
- Live ride activation controls
- Payout or wallet automation controls

## Duplicate Application Checks

Expected duplicate behavior:

- Active vendor application blocks another active vendor application for the same applicant or phone.
- Active Delivery Captain application blocks another active delivery application for the same applicant or phone.
- Active Ride Captain application blocks another active ride application for the same applicant or phone.
- Rejected or cancelled application states may allow a fresh application where supported by the backend status model.

## Evidence To Record After Deployment

| Test | Evidence owner | Result |
| --- | --- | --- |
| Vendor account OTP received | QA/Admin | Pending |
| Vendor password created | QA/Admin | Pending |
| Vendor application linked to account | QA/Admin | Pending |
| Delivery Captain account OTP received | QA/Admin | Pending |
| Delivery Captain password created | QA/Admin | Pending |
| Delivery Captain application linked to account | QA/Admin | Pending |
| Ride Captain password-created account required | QA/Admin | Pending |
| Admin sees account readiness badges | QA/Admin | Pending |
| Approval does not activate payouts/live rides | QA/Admin | Pending |

## Guardrails

Document uploads remain metadata/URL based. Do not commit or paste private document files, OTPs, passwords, keys, AABs, APKs, screenshots, keystores or `.env` files.
