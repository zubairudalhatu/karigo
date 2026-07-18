# Task 172 Vendor and Captain Onboarding Review Runbook

## Operator Goal

Review applicant accounts and applications safely so approved vendors and Captains can use the same verified account after approval.

## Vendor Review

1. Open Admin Portal.
2. Go to `Vendor Applications`.
3. Confirm the application shows:
   - Applicant account
   - Phone verified
   - Password created
   - Submitted business details
   - Submitted document metadata links, if provided
4. Move status through review states as needed.
5. Approve only after operational checks are complete.
6. Confirm the approved application appears in Admin `Vendors`.
7. Confirm Vendor Dashboard login uses the same approved account.

Vendor approval does not automatically activate storefront publication, payouts, promotions or pharmacy scope.

## Delivery Captain Review

1. Open Admin Portal.
2. Go to `Delivery Captain Applications`.
3. Confirm linked applicant account readiness:
   - Phone verified
   - Password created
   - Document evidence supplied or review note recorded
4. Review guarantor information.
5. Approve only after identity and operational review.
6. Confirm linked Captain account can be prepared for approved login.

Delivery Captain approval does not activate payouts or Ride access.

## Ride Captain Review

1. Open Admin Portal.
2. Go to `Ride Operations`.
3. Open `Ride Applications`.
4. Confirm:
   - Applicant account linked
   - Phone verified
   - Password created
   - Driver licence evidence
   - Vehicle particulars evidence
   - Insurance evidence where provided
5. Approve only as readiness review.

KariGO Rides remains disabled/readiness-only unless a future approved task enables live ride operations.

## Safe Review Notes

Admin notes may include:

- Verification status
- Missing document reminders
- Guarantor follow-up status
- Operational review comments

Admin notes must not include:

- OTPs
- Passwords
- Payment secrets
- Medical details beyond approved readiness context
- Private credentials

## Escalation

Escalate to engineering if:

- An applicant cannot complete OTP verification.
- A password-created account does not link to an application.
- Admin approval does not create/link the expected Vendor or Captain account.
- Duplicate application checks block a legitimate rejected/cancelled reapplication.

Record the issue in QA with safe metadata only.
