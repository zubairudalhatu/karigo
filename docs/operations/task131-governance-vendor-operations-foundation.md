# Task 131 Governance and Vendor Operations Foundation

This note records the safe governance, vendor operations, application document and account activation foundations added for KariGO pilot expansion.

## Scope Added

- Admin audit log visibility for recent internal actions.
- Login activity visibility for successful, failed and blocked login attempts.
- Vendor workspace audit log visibility.
- Vendor team member invitation records with roles.
- Vendor branch and location records.
- Vendor profile branding fields for logo and cover image URLs.
- Vendor account activation links for approved vendor users.
- Vendor application document metadata.
- Delivery Captain application profile photo and document metadata.
- Read-only developer/settings visibility for provider modes.
- User login activity logging foundation.
- Biometric credential data model readiness.

## Admin Workspace

Admin users can now review:

- Recent admin audit activity.
- Recent user login activity.
- Safe integration mode settings.
- Vendor activation link generation from the vendor management page.
- Vendor and Delivery Captain application document links submitted through application flows.

The developer/settings area is read-only. It does not enable live payments, live utilities, live rides, wallet withdrawals, payouts, marketing notifications or any production provider mode.

## Vendor Workspace

Approved vendors can manage safe operational records:

- Branches and locations.
- Team member invitation records.
- Business branding URLs for logo and cover image.
- Vendor audit log history.

Vendor team invitations are records only in this foundation. No automated invitation email or SMS is sent by this task.

## Vendor Account Activation

Admin can create a one-time activation link for an approved vendor account.

Security rules:

- The plaintext activation token is shown only once to the admin.
- The backend stores only a hashed token.
- The activation link expires.
- Old pending links are revoked when a new one is created.
- Activation sets the vendor user password and marks the account active.
- The activation flow does not expose passwords in logs, API responses or documentation.

## Application Documents

Vendor and Delivery Captain applications can now include document metadata:

- Document type.
- Display name.
- Public or controlled document URL.
- Verification status fields for future review.

No files, screenshots, credentials, IDs, OTPs or private documents should be committed to the repository. The current foundation stores references only.

## Biometric Readiness

The backend now has a data model for future biometric credential registration. Biometric login is not active, no fingerprint data is collected, and no passwordless authentication flow is enabled by this task.

## Provider and Mode Safety

The following remain disabled unless separately approved:

- Live Paystack, Monnify and Squad payments.
- Accelerate.ng live utilities.
- Wallet withdrawals and automatic refunds.
- Ride dispatch and live rides.
- Payout automation.
- Pharmacy marketplace.
- Provider login for public service providers.
- Marketing SMS, promotional email, newsletter email and bulk messaging.

## Deployment Notes

Required after merge:

- Run Prisma migrations on staging.
- Redeploy the backend API.
- Redeploy the Admin Portal.
- Redeploy the Vendor Dashboard.

No provider secrets or live mode flags are required for this foundation.
