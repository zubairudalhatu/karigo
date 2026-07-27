# Task 202 QA - Existing Customer Captain Onboarding

## Scope

Verify that an existing KariGO Customer can use the Captain app for Captain onboarding without creating a second account.

## Pre-Checks

- Backend deployed with Task 202 changes.
- Captain app OTA update published or fresh internal-test build installed if OTA is unreliable.
- Existing Customer account is active, phone verified and has a password.
- Admin Portal access is available for Delivery Captain application review.

## Test Cases

### Existing Customer Login

Expected result: Customer login succeeds in the Captain app. The dashboard shows onboarding guidance, not dispatch jobs.

Customer-facing copy to confirm:

- This account can continue Captain onboarding. Sign in to proceed.
- You are signed in with your KariGO account. Complete your Captain application to start onboarding.
- Captain operations will be available after KariGO approves your application.

### Existing Customer Starts Application from Public Account Step

1. Log out of the Captain app.
2. Open Apply to become a Captain.
3. Enter an existing Customer phone number.

Expected result: app/backend does not create a duplicate account and shows:

This phone number already has a KariGO account. Sign in with your existing KariGO password to continue your Captain application.

### Existing Customer Submits Delivery Captain Application

1. Sign in as the Customer.
2. Open Apply to become a Captain.
3. Complete Delivery Captain fields.
4. Submit.

Expected result: application is linked to the existing user account, appears in Admin Delivery Captain Applications and no duplicate user is created.

### Duplicate Application Handling

Submit again for the same account/phone.

Expected result: backend returns the existing application/status instead of creating a duplicate.

### Pending Applicant Lock

While the application is SUBMITTED or UNDER_REVIEW, open Home, Deliveries and Earnings.

Expected result: status/onboarding is visible and operations are blocked with safe copy. No order acceptance or delivery transitions are available.

### Admin Approval

Approve the Delivery Captain application from Admin Portal.

Expected result: an approved Rider/Captain profile is created or linked to the same user account. The Captain app can then load operational delivery screens.

### Forgot Password

Use Captain app Forgot password with the same Customer phone number.

Expected result: password reset OTP flow works for Customer and Captain applicant accounts. No separate Captain password is created.

## Regression Areas

- Existing approved Captain login still works.
- Customer App login still works.
- Vendor/Partner login is not accepted in the Captain app.
- Partner/Vendor onboarding remains unchanged.
- Ride Captain readiness remains review-only unless existing ride flags are enabled.
