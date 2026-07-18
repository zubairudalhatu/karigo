# Task 170 OTP Recovery and Activation Link Runbook

## Customer Password Recovery

1. Customer opens `Forgot password?`.
2. Customer enters registered Nigerian phone number in local or international format.
3. Backend normalizes the number and sends OTP if the account is eligible.
4. Customer enters OTP and new password.
5. Backend verifies OTP, updates password and marks a pending unverified customer active when appropriate.
6. Customer signs in with phone number and new password.

## Vendor Activation

1. Vendor submits public application.
2. Admin approves application.
3. Backend creates or links Vendor and Vendor user records.
4. Backend creates a one-time activation token.
5. Activation link is sent through approved transactional notification channels.
6. Vendor sets password through Vendor Dashboard activation page.
7. Vendor signs in and completes onboarding documents.

## Captain Activation

1. Delivery Captain submits public or in-app application.
2. Admin reviews application and documents.
3. Approved Captain accounts must be activated only through approved backend/Admin workflow.
4. Ride Captain remains review-only until KariGO Rides is separately enabled.

## Safety Controls

- Do not ask users to send OTP or passwords to support staff.
- Do not place activation tokens in Git-tracked files.
- Do not resend activation links without verifying the applicant identity and application status.
- Use environment flags for Termii/Resend notification channels.
