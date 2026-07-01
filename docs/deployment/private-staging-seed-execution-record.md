# Private Staging Seed Execution Record

## Seed Command

Run only against the approved private staging database:

```bash
npm run db:seed --workspace @karigo/backend-api
```

Required staging secrets before execution:

- `DATABASE_URL`
- `SEED_DEMO_PASSWORD`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PHONE`
- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_PASSWORD`

Do not write actual values into this file.

## Execution Record

| Field | Value |
| --- | --- |
| Date executed | Not executed |
| Environment | Private staging pending |
| Executed by | TBD |
| Seed command result | Blocked |
| Evidence reference | TBD |
| Confirmation no real customer/vendor/rider data used | Pending |

## Expected Staging-Safe Data Categories

- Kano pilot delivery zones documented for operations
- Super admin user
- Operations/admin user
- Demo customer and profile
- Demo customer address in supported Kano zone
- Demo vendor owner
- Active demo vendor
- Vendor categories
- Demo products
- Demo active/online rider
- `KARIGOFIRST` promo code
- Optional test support tickets
- Optional test order history only where required for simulation

## Current Seed Readiness

Repository seed readiness: **Ready for synthetic staging execution**.

The current Prisma seed creates a configurable super admin, operations admin, demo
customer, active vendor, food/grocery/market categories, demo products, active/online
rider, `KARIGOFIRST`, and a sample parcel order. It must be run only after a private
staging database is provisioned and secrets are configured outside Git.

## Known Seed Limitations

- Actual staging credentials must be distributed outside the repository.
- Real vendor, rider, customer, or production admin details must not be used.
- Re-running seed may update existing demo records.
- Support ticket examples are optional and should be added only if useful for the test
  run.
