# Task 168 - Live Onboarding OTP and Vendor Activation QA

## Environment

- Backend: `https://karigo-8htn.onrender.com/api/v1`
- Launch cities: Kano and Abuja
- Payment posture: Squad live checkout configured separately; wallet order payment and automatic refunds remain disabled unless approved.

## OTP Recovery Checks

Use a registered customer account that has not completed phone verification.

Expected behavior:

1. Open Customer App login.
2. Enter the registered phone number in Nigerian local or international format.
3. Enter the correct password.
4. Backend sends or resends OTP, respecting cooldown.
5. Customer App routes to OTP verification.
6. OTP screen explains that phone verification is required.
7. Wrong password still returns the normal invalid-login message.
8. Verified customer login remains unchanged.

Do not record real OTPs, passwords, SMS screenshots, or phone numbers in Git.

## Vendor Activation Checks

Use an approved but not-yet-active Vendor account.

Expected behavior:

1. Vendor opens the old or expired activation link.
2. Vendor Dashboard shows a clear invalid/expired link message.
3. Vendor enters the approved phone number or email on the activation page.
4. Backend accepts the request without revealing whether the account exists.
5. Backend sends a fresh setup link through approved application notification channels when the Vendor is eligible.
6. Admin can also send a fresh activation link from Admin Vendors or Vendor Applications.
7. Admin Portal never displays or prompts for the raw activation URL.
8. Activation token is single-use after successful password setup.

## Payment URL Regression

Hosted payment URLs must open externally.

Expected behavior:

- Squad authorization URLs beginning with `https://` are opened through the Customer App external-link helper.
- Expo Router must not receive the hosted checkout URL as an internal route.
- Payment success is confirmed only by backend verification/webhook.

## Evidence Rules

- Do not store real OTP values.
- Do not store activation URLs.
- Do not store access tokens, refresh tokens, passwords, or provider credentials.
- Use masked phone/email values in manual QA notes.
