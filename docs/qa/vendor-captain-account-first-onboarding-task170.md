# Task 170 Vendor and Captain Account-First Onboarding Verification

## Current Flow

- Vendor public applications collect account contact details first and approved vendors receive secure Vendor Dashboard activation links after Admin approval.
- Delivery Captain public and in-app applications collect account contact details first and remain Admin-reviewed before any Captain account is active.
- Ride Captain applications remain review-only; KariGO Rides is not live.

## Verification Checklist

1. Submit a vendor application with Kano or Abuja location.
2. Confirm duplicate applications are blocked or handled by the existing review process.
3. Approve the vendor application in Admin.
4. Confirm a Vendor record appears under Admin Vendors.
5. Confirm activation/password setup link is sent only through approved notification channels.
6. Activate vendor account and log into Vendor Dashboard.
7. Upload onboarding documents through Vendor Dashboard.
8. Confirm Admin can review uploaded documents.
9. Submit a Delivery Captain application.
10. Confirm application notifications are attempted only when enabled by environment flags.
11. Confirm Admin can review Delivery Captain applications and documents.
12. Confirm Ride Captain application remains review-only and does not activate ride dispatch.

## Guardrails

- Do not store passwords, OTPs, payment secrets or document private links in this QA record.
- Public forms must not require frontend-held admin tokens.
- Account activation remains approval-controlled.
- Live rides, provider login outside approved workspaces, payouts and marketing notifications remain disabled.

## Follow-Up Note

If KariGO requires pre-application OTP/password account creation for Vendor or Captain applicants before form submission, implement it as a dedicated backend schema/API task. The current safe production path remains approval-first account activation.
