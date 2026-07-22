# Prisma Accelerate Setup

Task 188A adds safe Prisma Accelerate support for the KariGO backend runtime. Prisma Accelerate improves production database connection handling and query routing while preserving the existing direct PostgreSQL workflow for local development and migrations.

## What Changes

- Backend runtime can use Prisma Accelerate when `DATABASE_URL` is a Prisma Accelerate connection string.
- Backend runtime can also be explicitly gated with `PRISMA_ACCELERATE_ENABLED=true`.
- Local development remains compatible with a direct PostgreSQL `DATABASE_URL`.
- Prisma schema and migrations are unchanged.
- No database secrets or connection strings should be committed.

## Required Render Environment Variables

Set names only in Render or an approved secret manager. Do not put values in source control.

```text
DATABASE_URL=<Prisma Accelerate connection string for backend runtime>
DIRECT_URL=<Direct PostgreSQL connection string for migrations and rollback>
PRISMA_ACCELERATE_ENABLED=true
```

`DIRECT_URL` must be a direct PostgreSQL URL, not an Accelerate URL.

## Migration Compatibility

Prisma migrations must run against the direct PostgreSQL database URL. Do not run `prisma migrate deploy` against the Accelerate URL.

Recommended deployment pattern:

1. Use `DIRECT_URL` as the database URL for the migration step.
2. Run `prisma migrate deploy`.
3. Generate Prisma Client.
4. Build and start the backend with runtime `DATABASE_URL` pointing to Prisma Accelerate.

If the Render build command runs migrations directly, update the migration step so it uses the direct PostgreSQL connection value from `DIRECT_URL`. Keep runtime `DATABASE_URL` on the Accelerate URL only after migrations are complete.

## Runtime Safety

Backend startup validation fails when:

- `PRISMA_ACCELERATE_ENABLED=true` but `DATABASE_URL` is not a Prisma Accelerate URL.
- Prisma Accelerate is active but `DIRECT_URL` is missing.
- `DIRECT_URL` is an Accelerate URL.
- `DIRECT_URL` is not a PostgreSQL connection string.

When `PRISMA_ACCELERATE_ENABLED=false` and `DATABASE_URL` is a direct PostgreSQL URL, the backend keeps the normal direct Prisma Client path.

## Post-Deployment Smoke Tests

After Render redeploy:

```text
GET /api/v1/health
Customer login/auth
Customer catalogue browsing
Checkout quote
Wallet top-up record creation
Admin Portal API load
Vendor Dashboard API load
SME Services request list/detail
Provider application submission
```

## Rollback Plan

1. Restore `DATABASE_URL` to the direct PostgreSQL connection string in Render.
2. Set `PRISMA_ACCELERATE_ENABLED=false`.
3. Keep `DIRECT_URL` available for migration/recovery workflows.
4. Redeploy the backend.
5. Run health and smoke tests.

No Prisma migration is required for rollback because Task 188A does not change the database schema.
