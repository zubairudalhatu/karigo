# Task 164 - Kano and Abuja Live Onboarding Readiness

## Purpose

This record captures the launch-readiness changes for KariGO onboarding in Kano and Abuja after live testing found remaining gaps in Customer App payment handling, Admin Developer Settings, website city copy, and refund information.

## Launch Position

- Launch cities: Kano and Abuja.
- Primary payment provider: Squad by GTBank.
- Monnify and Paystack: pending approval / future secondary providers.
- Mock payment: staging/testing fallback only.
- KariGO Rides: readiness-only until live ride dispatch is separately approved.
- Wallet top-up/payment: readiness only until backend verification/debit flows are completed.
- Cash/POD: readiness and operations guardrails only until a cash-pending order workflow is implemented.

## Implemented Updates

- Website vendor, Delivery Captain, Ride Captain and SME provider application forms now support controlled Kano/Abuja location options.
- Backend vendor and Delivery Captain public application validation now accepts only approved launch city/state pairs: Kano/Kano and Abuja/FCT.
- Customer App launch support copy includes Kano/Abuja, Squad readiness, Cash/POD readiness, wallet guardrails, and returns/refunds access.
- Captain App application and Ride readiness screens guide applicants toward Kano/Abuja launch locations.
- Admin Developer Settings now reads normalized payment flags and shows Squad live readiness accurately when the approved environment gate is configured.
- Admin Payment Readiness shows live-mode Squad guidance instead of presenting sandbox initialization as the primary live action.

## Not Activated

- No production store publishing was performed.
- No Monnify or Paystack live mode was enabled.
- No uncontrolled live ride dispatch was enabled.
- No automatic wallet credit, refund, withdrawal, or payout automation was enabled.
- No cash order is marked electronically paid.
- No bulk marketing message sending was enabled.

## Deployment Notes

- Backend redeploy is required.
- Admin Portal redeploy is required.
- Website redeploy is required.
- Customer EAS Update is required for the Customer App UI/payment-link fix.
- Captain EAS Update is recommended for Captain application wording.
- Fresh Customer/Captain AAB builds are not required by this task because no new native dependency or app config change was added.
- Prisma migration is not required.
