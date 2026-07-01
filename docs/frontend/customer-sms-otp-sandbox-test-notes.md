# Customer SMS OTP Sandbox Test Notes

## Current Flow

- Registration transitions to the OTP screen with the normalized phone number.
- Mock mode may prefill `mockOtp` for local development only.
- Termii/staging responses do not include an OTP.
- Verification has loading, success navigation, and normalized friendly errors.
- Resend calls the backend endpoint and now shows a 60-second countdown matching the
  current configured staging cooldown.
- A successful resend resets the countdown and clears stale messages.

## Sandbox Behavior

The user manually enters the SMS-delivered code. The app must never expect a code from a
Termii API response. Backend expiry, attempt-limit, and cooldown responses remain the
source of truth even when the local countdown is displayed.

Test these states on a staging build:

- Registration send pending and success transition
- Verification loading and success
- Invalid and expired code errors
- Attempt-limit guidance
- Resend disabled during cooldown
- Resend success and provider failure
- Offline/network retry behavior

## Known Limitations

- The countdown is currently a UI mirror of the configured 60-second staging default; the
  backend does not return a dedicated `retryAfterSeconds` value.
- OTP expiry countdown, OS autofill/paste optimization, and distributed rate-limit UX are
  future improvements.
- The app does not retain OTPs beyond the active screen, but physical-device validation is
  still required.

## Mock Rollback

After staging is returned to `OTP_PROVIDER=mock` and `SMS_PROVIDER=mock`, local development
may receive and prefill `mockOtp`. This behavior must remain disabled in production-like
mode and must never be used as evidence of SMS delivery.
