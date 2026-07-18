# Task 173 Live Launch Impact

Date: 18 July 2026

## Launch Position

KariGO remains focused on Kano and Abuja launch readiness.

Active/controlled launch options:

- Squad by GTBank: primary online payment provider.
- Cash / Pay on Delivery: manually reconciled launch payment option.
- Wallet top-up: Squad-backed and backend-verified only when enabled.

Still disabled unless separately approved:

- live Monnify/Paystack checkout
- automatic wallet refunds
- wallet withdrawal
- payout automation
- live ride dispatch
- Pharmacy marketplace
- live utility fulfilment
- marketing/bulk messaging

## Deployment Impact

- Backend redeploy: required.
- Prisma migration: required for Rider preferred service areas.
- Customer fresh AAB/APK: required because of the new Expo WebBrowser native dependency.
- Captain fresh AAB/APK: recommended for internal testing.
- Admin Portal redeploy: required for visible Vendor Trash guardrail changes.
- Vendor Dashboard redeploy: not required by Task 173 changes.
- Website redeploy: not required by Task 173 changes.

## Post-Deploy Checks

1. Backend health is OK.
2. Prisma migration is applied.
3. Admin Payment Readiness still shows Squad live readiness without exposing secrets.
4. Customer checkout opens Squad externally.
5. Customer wallet top-up opens Squad externally.
6. Pay on Delivery creates `CASH_PENDING` orders in Kano and Abuja.
7. Vendor Dashboard sees Cash/POD orders.
8. Captain requires cash collection confirmation for Cash/POD completion.
9. Admin can reconcile Cash/POD.
10. Admin Vendor Trash blocks vendors with products or live orders.
11. Live cleanup script dry-run completes before any confirmed cleanup.

## Next Recommended Step

Deploy backend/Admin changes, apply the Rider preferred-service-areas migration, then build fresh Customer and Captain internal-testing artifacts for final live QA.
