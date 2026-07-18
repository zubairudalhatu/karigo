# Task 172 OTP Recovery and Live Onboarding Verification

## Purpose

Verify that OTP recovery and resend behavior supports account-first Vendor and Captain onboarding without weakening customer OTP recovery.

## Approved OTP Uses

- Customer registration verification
- Customer password reset and unverified-account recovery
- Vendor applicant account verification
- Delivery Captain applicant account verification
- Ride Captain applicant account verification

No marketing SMS, promotional SMS, order SMS, referral SMS or utility SMS is enabled by this task.

## Verification Sequence

1. Enter a local Nigerian phone number such as `080...`.
2. Confirm backend normalizes it to international format before storage/use.
3. Confirm OTP is sent by the configured OTP provider.
4. Use `Resend OTP` once and confirm cooldown behavior is safe.
5. Verify OTP.
6. Create password.
7. Submit the application with the same normalized phone number.
8. Confirm duplicate active application attempts return a safe validation message.

## Customer OTP Recovery Regression

Customer recovery should continue to support:

- Login blocked with verification-required response when the account is unverified.
- OTP resend for eligible unverified accounts.
- Password reset request by phone number.
- Password reset confirmation by OTP.
- No account-existence disclosure for unsupported phone numbers.

## Safe Evidence

Record only:

- Phone format used, masked where needed
- Whether OTP was received
- Whether resend was accepted
- Whether password creation succeeded
- Backend status or safe error message

Do not record:

- OTP values
- Passwords
- Tokens
- Provider API keys
- Screenshots with private user data

## Current Expected Status

Implementation is ready for post-deploy verification. Termii/Resend provider behavior depends on Render environment flags and configured provider credentials outside Git.
