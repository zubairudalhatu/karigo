# Customer OTP Provider Notes

## Current Behavior

Registration sends an OTP through the backend-selected provider. In local mock mode, the
backend may return `mockOtp`, which the customer app prefills for development. The OTP
screen can verify or request a replacement code.

## When Real SMS Is Enabled

- The app must never expect or display `mockOtp`.
- The customer enters the code received by SMS.
- The resend button calls `POST /auth/resend-otp`.
- Provider failures, expiry, cooldown, and attempt-limit responses should be shown as
  friendly messages without raw backend details.
- Nigerian phone numbers may be entered in common local formats; the backend stores and
  sends the normalized `+234...` value.

Suggested messages:

- "A new verification code has been sent. Please check your phone."
- "This verification code has expired. Request a new code."
- "Too many incorrect attempts. Request a new verification code."
- "Please wait before requesting another verification code."

## Frontend TODOs

- Read a future backend `retryAfterSeconds` value instead of mirroring the current
  60-second staging default in the UI.
- Add OTP expiry countdown and paste/autofill support.
- Add clearer offline/retry handling.
- Never persist OTP values beyond the active verification screen.

Task 33 staging test guidance is in `customer-sms-otp-sandbox-test-notes.md`.
