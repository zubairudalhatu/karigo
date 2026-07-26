# Production Demo Data Cleanup - Task 194

This runbook is for removing or isolating known seed/demo content from production-facing KariGO surfaces before wider launch.

It must not be used to delete real customer, wallet, order, payment, vendor, captain, service-provider or application records. The cleanup script is intentionally conservative: it archives or deactivates clearly seeded/demo records and keeps audit-sensitive transactional records.

## What The Cleanup Targets

The backend cleanup command targets records created by the development/staging seed:

- demo Operations Admin, Vendor, Customer and Captain accounts identified by known seed phone numbers/emails;
- seeded vendors: `Kano Kitchen`, `Kano Fresh Mart`, `Kano Everyday Market`;
- products and vendor services belonging to those seeded vendors;
- seeded captain profile `KGO-RIDER-SAMPLE`;
- seeded parcel order `KGO-SEED-PARCEL-001`, only if not already closed;
- utility providers/products with codes beginning `DEMO_`;
- obvious service-provider demo records using conservative `demo`, `sample` or `staging` markers.

## What The Cleanup Does Not Delete

The script does not hard-delete records. It also does not mutate real-looking operational ledgers by default.

Retained for audit review:

- payments;
- wallet balances and wallet ledger entries;
- utility transaction records;
- completed/closed orders;
- vendor settlements and captain earnings;
- Super Admin bootstrap account.

Linked operational records are counted in the script output so Admin/Ops can review them before and after cleanup.

## Required Environment Flags

Set values only in the approved runtime environment or local shell. Do not commit `.env` files.

| Variable | Purpose |
| --- | --- |
| `CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN` | Defaults to dry-run. Set to `false` only for the approved mutation run. |
| `CONFIRM_PRODUCTION_DEMO_CLEANUP` | Must be `true` before mutation is allowed. |
| `DATABASE_URL` | Runtime database connection, supplied by the host or local secret store. |

## Dry-Run

Run from the monorepo root:

```bash
npm run cleanup:production-demo-data --workspace @karigo/backend-api
```

Expected result:

- candidate counts are printed;
- no records are changed;
- linked orders/payments/wallets/utility transactions are listed as retained counts.

## Confirmed Cleanup

Only run after reviewing dry-run counts and confirming a production backup exists.

```bash
CLEANUP_PRODUCTION_DEMO_DATA_DRY_RUN=false CONFIRM_PRODUCTION_DEMO_CLEANUP=true npm run cleanup:production-demo-data --workspace @karigo/backend-api
```

Expected mutations:

- seeded vendors are closed and hidden from public catalogues;
- seeded products/services are archived;
- `DEMO_` utility providers/products are disabled;
- seeded demo users are deactivated and active tokens revoked;
- a Super Admin audit-log entry records the cleanup summary if a Super Admin exists.

## Verification

After cleanup:

- Customer App and Customer Web Portal should not show seeded vendors/products.
- Vendor Dashboard should not expose seeded vendor workspaces as active pilot vendors.
- Admin > Vendors should show the seeded vendors as closed/archived, not active.
- Admin > Utilities should not show `DEMO_` products as active live options.
- Admin > Audit Logs should include `admin.production_demo_cleanup.task194` if a Super Admin account exists.

## Rollback

If cleanup is run by mistake:

1. Restore the verified pre-cleanup database backup if real launch data is affected.
2. For seed-only records that simply need to reappear in staging, run the seed in a non-production environment with demo flags enabled.
3. Do not re-enable demo data in production unless KariGO leadership explicitly approves it for a temporary internal review window.
