# Task 168 - Live Onboarding Account-First Notes

## Scope

KariGO is preparing live Kano and Abuja onboarding while keeping restricted services gated.

Active launch posture:

- Customer registration remains phone-number first with OTP verification and password-based login.
- Vendor public application forms now lead with business account contact details and collect launch-city business data for Kano and Abuja.
- Delivery Captain application forms now lead with Captain account contact details and collect launch-city applicant data for Kano and Abuja.
- Vendor approval creates or links a Vendor account and sends a secure Vendor Dashboard password setup link through approved application notification channels.
- Delivery Captain and Ride Captain applications remain review workflows. They do not auto-approve, activate dispatch, activate payouts, or create a public provider login.

## Customer Onboarding

Customer flow:

1. Customer enters phone number and signup details.
2. Backend normalizes Nigerian phone numbers.
3. Backend sends OTP through the configured OTP provider.
4. Customer verifies OTP.
5. Customer receives an authenticated session and continues into the Customer App.

If a registered customer did not complete OTP verification, login with the correct password now resends/continues OTP verification instead of forcing re-registration.

## Vendor Onboarding

Public website vendor application flow:

1. Applicant enters business phone and email first.
2. Applicant selects Kano/Kano or Abuja/FCT.
3. Applicant completes business details.
4. Applicant may supply business registration number and secure document evidence links.
5. KariGO Admin reviews the application.
6. On approval, backend creates or links a Vendor and Vendor user account.
7. Backend sends the Vendor Dashboard password setup link by approved application notification channels.
8. Vendor activates the account and completes onboarding documents in Vendor Dashboard.

Current implementation note: public website OTP-before-form gating is not activated. Account access is established after Admin approval through the secure activation link flow.

## Captain Onboarding

Delivery Captain application flow:

1. Applicant enters Captain phone/email contact first.
2. Applicant selects Kano/Kano or Abuja/FCT.
3. Applicant completes residential address, vehicle type and guarantor details.
4. Applicant may supply profile photo and document evidence links.
5. KariGO Admin reviews the application.

Captain App in-app application flow also supports Delivery Captain interest and Ride Captain review interest. It remains an application/review record only and does not activate dispatch, live rides, payouts, or login access by itself.

## Guardrails

- No secrets are stored in Git.
- No applicant is auto-approved.
- Ride Captain remains operations-review only.
- Wallet order payment remains disabled unless backend config explicitly enables it.
- Live provider integrations remain controlled by backend flags and Render environment variables.
