# Task 133 Vendor Approval, Activation and Onboarding Flow

## Purpose

This note records the corrected vendor approval-to-activation flow for KariGO pilot
operations.

## Flow

1. Vendor submits a public application.
2. Admin reviews the application.
3. Admin approves the application.
4. Backend creates or links a Vendor user and Vendor record.
5. Vendor appears under Admin > Vendors with `PENDING_APPROVAL` status.
6. Backend creates a one-time Vendor Dashboard activation link.
7. Approval email includes the secure password setup link.
8. SMS review notification, when enabled, does not include the activation token and
   tells the applicant to check email.
9. Vendor sets password on the Vendor Dashboard activation page.
10. Vendor logs in and submits onboarding document references.
11. Admin reviews onboarding documents.
12. Admin can mark the vendor `ACTIVE` only after submitted onboarding documents are
    approved.

## Safety Rules

- Activation tokens are never stored in plaintext.
- Do not paste activation links, passwords, OTPs, API keys or private document contents
  into Git-tracked documentation.
- Vendor approval does not activate live payments, payouts, public provider login,
  Pharmacy marketplace, live rides, ride dispatch or utility fulfilment.
- New approved vendors start as `PENDING_APPROVAL`; Admin must separately mark them
  operational after onboarding review.
- Vendor onboarding documents are metadata/URL references only. Private files must be
  stored in the approved secure storage location outside the repository.

## Admin Review Rules

- Application approval creates or links the vendor account idempotently.
- Marking a vendor `ACTIVE` is blocked until at least one onboarding document exists and
  all submitted onboarding documents are approved.
- Rejected onboarding documents keep the vendor out of operational status until the
  vendor submits corrected documents and Admin approves them.

## Deployment Notes

Required after merge:

- Run Prisma migrations.
- Redeploy backend API.
- Redeploy Admin Portal.
- Redeploy Vendor Dashboard.

Customer APK and KariGO Captain APK are not required for this task.
