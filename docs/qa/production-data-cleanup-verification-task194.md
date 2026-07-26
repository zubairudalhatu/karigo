# Production Data Cleanup Verification - Task 194

Use this checklist after deploying the Task 194 seed guardrails and, if approved, running the production demo cleanup command.

## Seed Guardrail Checks

| Check | Expected Result | Status |
| --- | --- | --- |
| Production-like seed with `APP_ENV=production` and demo flags disabled | Super Admin is ensured; demo users/vendors/products/orders/utilities are skipped. | Pending |
| Production-like seed without `SUPER_ADMIN_PASSWORD` | Seed fails with a safe setup error. | Pending |
| Staging seed with no demo-disable flag | Existing staging demo accounts/catalogues remain available for QA. | Pending |
| Staging seed with `ALLOW_DEMO_SEED_DATA=false` | Demo users/vendors/products/orders/utilities are skipped. | Pending |

## Cleanup Dry-Run Checks

| Check | Expected Result | Status |
| --- | --- | --- |
| Run `npm run cleanup:production-demo-data --workspace @karigo/backend-api` | Candidate counts print; no records mutate. | Pending |
| Dry-run output includes linked operational counts | Orders, payments, wallets and utility transactions are reported as retained counts. | Pending |
| No raw secrets appear in output | Output shows IDs/counts/statuses only. | Pending |

## Confirmed Cleanup Checks

Run only after backup approval.

| Check | Expected Result | Status |
| --- | --- | --- |
| Confirmed cleanup run | Seeded vendors are closed, products/services archived, `DEMO_` utilities disabled. | Pending |
| Demo accounts | Known seeded demo accounts are deactivated; Super Admin remains active. | Pending |
| Seeded parcel order | `KGO-SEED-PARCEL-001` is cancelled only if it was not already closed. | Pending |
| Audit visibility | Admin Audit Logs include `admin.production_demo_cleanup.task194` when a Super Admin exists. | Pending |

## Surface Checks

| Surface | Expected Result | Status |
| --- | --- | --- |
| Customer App catalogue | No seeded demo vendor/product appears as a live vendor. | Pending |
| Customer Web Portal | No seeded demo vendor/product appears in production-facing browsing. | Pending |
| Public Website | Homepage preview uses generic order copy, not a seeded vendor name. | Pending |
| Vendor Dashboard | Demo seeded vendor workspace is not active for production operations. | Pending |
| Admin Portal | Closed/archived demo records remain visible for audit review where applicable. | Pending |
| Utilities | `DEMO_` utility products/providers are not active production options. | Pending |

## Remaining Guardrails

- Do not run development/staging demo seed in production unless both demo seed flags are deliberately enabled for an approved temporary review window.
- Do not hard-delete records that have payments, wallet ledger entries, orders, settlements or utility transactions.
- Use database backups for rollback if real production data is affected.
