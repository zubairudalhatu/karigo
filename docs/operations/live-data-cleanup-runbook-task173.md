# Task 173 Live Data Cleanup Runbook

Date: 18 July 2026

This runbook is for controlled cleanup of known test/demo data before launch expansion. It must not be used for broad production data deletion.

## Protected Account

Always preserve the main Super Admin account:

- Email: `karigoapp@gmail.com`
- Phone: `08055333358`
- Normalized phone equivalent: `+2348055333358`

## Script

Backend workspace command:

```powershell
cd services/backend-api
npm run cleanup:live
```

The script is:

```text
services/backend-api/scripts/live-data-cleanup.cjs
```

## Default Dry Run

Dry run is the default. It counts candidate records and does not mutate data.

```powershell
cd services/backend-api
$env:DRY_RUN="true"
npm run cleanup:live
```

Review the printed candidate counts before approving any mutation.

## Confirmed Cleanup

Only run after an owner/operator confirms the dry-run counts.

```powershell
cd services/backend-api
$env:DRY_RUN="false"
$env:CONFIRM_LIVE_CLEANUP="true"
npm run cleanup:live
Remove-Item Env:\CONFIRM_LIVE_CLEANUP
$env:DRY_RUN="true"
```

Mutation mode refuses to run unless both conditions are true:

- `DRY_RUN=false`
- `CONFIRM_LIVE_CLEANUP=true`

## Candidate Matching

The script targets obvious synthetic records containing terms such as:

- `demo`
- `staging`
- `sample`
- `test`
- `qa`

Candidate areas include:

- users
- customer profiles
- vendor accounts and applications
- Delivery Captain applications
- Ride Captain applications
- orders
- payments
- wallet top-up ledger entries
- vendor settlements
- Captain earnings
- managed ad campaigns

## Mutation Strategy

The script avoids hard deletes.

- Active orders are cancelled.
- Pending payments are cancelled.
- Pending wallet ledger entries are cancelled.
- Wallets are suspended.
- Vendor applications are withdrawn where safe.
- Captain applications are rejected with an internal cleanup note.
- Products and services are archived/disabled.
- Vendor accounts are closed and soft-deleted.
- Captain profiles are suspended/offline and soft-deleted.
- Synthetic users are deactivated and soft-deleted.
- Refresh/device tokens are revoked/disabled.

## Audit

If the protected Super Admin account exists, the script creates one `admin.live_cleanup.task173` audit log entry summarising mutation counts.

## Safety Rules

- Never commit `.env` files or database URLs.
- Never paste live database credentials into docs.
- Never run confirmed cleanup before reviewing dry-run counts.
- Never change the protected Super Admin account.
- Prefer archive/deactivate/cancel over permanent deletion.
