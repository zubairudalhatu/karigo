# Task 171 Live Mobile Smoke Test Record

Date: 18 July 2026

## Scope

This record is for live mobile smoke testing after uploading the Task 171 Customer and KariGO Captain AABs to Google Play Internal Testing. Do not mark items passed until the installed internal-testing builds are exercised on Android devices.

## Build References

- Customer EAS build ID: `7607b400-412c-49be-b321-a8677ddb98cc`
- Customer package/versionCode: `com.karigo.customer` / `4`
- Captain EAS build ID: `e4e3d2e1-dcca-4135-9638-d571d4989f23`
- Captain package/versionCode: `com.karigo.rider` / `5`

## Customer Smoke Checklist

Use a real approved test account only. Do not record passwords, OTPs, payment secrets, screenshots or payment-card details in this document.

- [ ] Customer login succeeds.
- [ ] Forgot password request accepts a phone number and sends OTP through the approved auth flow.
- [ ] OTP recovery works for a registered but unverified customer.
- [ ] Change password works from Privacy & Security.
- [ ] Biometric sign-in can be enabled after password login.
- [ ] Biometric sign-in can be disabled.
- [ ] Biometric sign-in refreshes the backend session and does not bypass backend auth.
- [ ] In-app Privacy Policy page opens.
- [ ] In-app Terms page opens.
- [ ] Squad order payment opens externally, not as an Expo Router page.
- [ ] Order payment verification only marks paid after backend confirmation.
- [ ] Wallet top-up opens externally.
- [ ] Wallet top-up verification refreshes balance/activity only after backend confirmation.
- [ ] Pending wallet top-up shows a retry-friendly message when not yet confirmed.
- [ ] Pay on Delivery appears only when backend public payment config exposes it.

## KariGO Captain Smoke Checklist

Use an approved Delivery Captain account only. Do not record passwords, OTPs or private location screenshots.

- [ ] Captain login succeeds.
- [ ] Captain session persists after app restart.
- [ ] Captain biometric sign-in can be enabled after password login.
- [ ] Captain biometric sign-in can be disabled.
- [ ] GPS permission prompt appears when updating location.
- [ ] Offline location update shows: `Go online before updating live location.`
- [ ] Online Captain location update succeeds where permission is granted.
- [ ] Captain home has one clear status chip and no duplicated Online/Offline badge.
- [ ] Captain Profile contains detailed account/security/legal sections without repeating home content.
- [ ] In-app Privacy Policy page opens.
- [ ] In-app Terms page opens.

## Known Remaining Follow-Up

Full account-first Vendor and Captain onboarding still requires a separate schema/API task. The current safe production flow remains application review followed by activation/password setup after approval.

## Result

- Overall smoke-test status: Pending manual execution after Play Internal Testing upload
- Blockers found:
- Notes:
