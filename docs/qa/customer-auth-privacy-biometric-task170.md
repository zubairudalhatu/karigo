# Task 170 Customer Auth, Privacy and Biometric Verification

## Scope

This record covers Customer App password recovery, password change, in-app Privacy/Terms pages, biometric sign-in controls and account deletion/deactivation support request.

## Expected Behaviour

- Login includes `Forgot password?`.
- Password reset starts with registered phone number and backend OTP.
- Reset confirmation requires phone number, OTP and a new password.
- Registered but unverified users can recover by OTP and set a password.
- Authenticated customers can change password after entering the current password.
- Privacy Policy and Terms are readable inside the app, with buttons to open the public website versions.
- Biometric sign-in uses device biometrics only to refresh a saved backend session from secure storage.
- If the refresh token is missing, revoked or expired, password login is required.
- Account deletion/deactivation opens a support-reviewed request, not an automatic destructive delete.

## Manual QA

1. On login, tap `Forgot password?`.
2. Enter a local Nigerian phone number such as `080...`.
3. Confirm the backend sends an OTP through the configured auth SMS provider.
4. Enter the OTP and a new password.
5. Confirm login succeeds with the new password.
6. From `Profile -> Privacy & security`, open `Change password`.
7. Confirm wrong current password is rejected.
8. Confirm correct current password updates the password.
9. Open in-app Privacy Policy and Terms pages.
10. Enable biometric sign-in on a device with fingerprint/face unlock enrolled.
11. Confirm biometric sign-in can refresh a saved session.
12. Log out or revoke refresh token and confirm biometric sign-in no longer bypasses backend auth.
13. Submit account deletion/deactivation request and confirm a support ticket is created.

## Guardrails

- Never record OTP values or passwords in QA evidence.
- Biometric sign-in is not a standalone credential and must not bypass backend refresh validation.
- Account deletion remains support-reviewed until operations approves the request.
