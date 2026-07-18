# Task 172 Kano and Abuja Account-First Onboarding Launch Note

## Launch Cities

KariGO account-first onboarding is prepared for:

- Kano
- Abuja / FCT

Vendor and Captain application forms should reject unsupported city/state pairs.

## Account-First Policy

Public vendor, Delivery Captain and Ride Captain applicants must create and verify their account before application submission:

1. Account creation
2. OTP verification
3. Password creation
4. Application details
5. Document/evidence metadata
6. Admin review
7. Approved account activation/login readiness

## Live Feature Guardrails

This task does not activate:

- Live payments beyond already approved payment configuration
- Live rides or ride dispatch
- Payout automation
- Wallet withdrawal or refund automation
- Public provider login
- Pharmacy marketplace
- Marketing SMS/email
- Bulk SMS/email

## Document Handling

Application documents remain secure URL/metadata records. KariGO must not commit document files, OTPs, passwords, keys, `.env` files, APK/AAB files, screenshots, keystores or artifact URLs into Git.

## Deployment Impact

Expected deployment requirements:

- Backend redeploy: required
- Prisma migration: required
- Website redeploy: required
- Admin Portal redeploy: required
- Captain app update/build: required for in-app onboarding changes
- Customer app update/build: not required unless bundled release planning requires it
- Production publishing: not performed by this task

## Launch Review Status

Post-deploy verification remains required before inviting wider Kano or Abuja applicants.
