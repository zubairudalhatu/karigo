# Task 173 Live QA Fix Verification Checklist

Date: 18 July 2026

Use real approved launch test accounts only. Do not record passwords, OTPs, payment secrets, screenshots, APK/AAB files or direct build artifact URLs in this document.

## Customer App

- [ ] Home no longer shows `Kano + Abuja launch cities` in the top block.
- [ ] Home requests location only through a user-controlled action or safe optional detection.
- [ ] Home shows `Serving your area: Kano` or `Serving your area: Abuja` only after a valid city is detected.
- [ ] If city detection fails, no blank/awkward city fallback is displayed.
- [ ] Profile > Services and applications shows `Become a KariGO Captain`.
- [ ] Captain application link opens a clean in-app information page.
- [ ] Checkout live mode shows Squad by GTBank only when backend public config exposes Squad as the selectable provider.
- [ ] Squad order checkout opens externally, not as an Expo Router 404.
- [ ] Returning from Squad checkout requires backend payment verification.
- [ ] Wallet top-up is visible only when backend public config enables it.
- [ ] Wallet top-up opens externally.
- [ ] Wallet top-up balance changes only after backend verification/webhook success.
- [ ] Pending wallet verification shows `Payment is still pending verification`.
- [ ] Pay on Delivery creates an order in Kano.
- [ ] Pay on Delivery creates an order in Abuja.
- [ ] Pay on Delivery order stays `CASH_PENDING` until Admin reconciliation.
- [ ] Forgot password and OTP recovery still work.
- [ ] Change password still works.
- [ ] Privacy Policy and Terms open in-app.
- [ ] Biometric enable/disable falls back gracefully where unsupported.

## Captain App

- [ ] Home uses a light branded top card.
- [ ] Home has one clear Online/Offline control.
- [ ] Online status chip is green when online.
- [ ] Availability badge does not overflow the card.
- [ ] Home does not repeat Captain modes, Ride readiness, operational guardrails or Captain tools.
- [ ] Home shows compact Today/completed delivery stats.
- [ ] Home shows active delivery and assigned deliveries.
- [ ] Profile keeps Captain modes.
- [ ] Profile allows safe profile photo URL update.
- [ ] Profile stores preferred Ride service areas for future review.
- [ ] Location update requires online/on-delivery status.
- [ ] GPS permission denied, offline, unavailable and backend failure messages are clear.
- [ ] Cash/POD job completion requires cash collection confirmation before OTP completion.

## Website And Admin

- [ ] Website Vendor account-first onboarding remains visible.
- [ ] Website Delivery Captain account-first onboarding remains visible.
- [ ] Website Ride Captain account-first onboarding remains readiness-gated.
- [ ] Kano and Abuja remain launch cities in public onboarding copy.
- [ ] Admin Vendor Applications show linked account, OTP status, password status, account status, city/state and documents.
- [ ] Admin Delivery Captain Applications show linked account, OTP status, password status, city/state and documents.
- [ ] Admin Ride Applications show linked account, OTP status, password status, city/state and documents.
- [ ] Admin Vendor Trash blocks vendors with catalog products or live orders.
- [ ] Admin Vendor Trash action is audited when allowed.

## Backend

- [ ] Order payment initialization returns a public HTTPS checkout link for Squad.
- [ ] Wallet top-up initialization returns a public HTTPS checkout link for Squad.
- [ ] Backend rejects insecure/non-HTTPS Squad checkout URLs.
- [ ] Backend verification remains required before paid/credited states.
- [ ] Cash/POD reconciliation remains Admin-only.
- [ ] Live cleanup script dry-run prints candidate counts without mutation.
- [ ] Live cleanup mutation refuses to run unless `DRY_RUN=false` and `CONFIRM_LIVE_CLEANUP=true`.

## Result

- Verification status: Pending deployment and manual QA.
- Blockers found:
- Notes:
