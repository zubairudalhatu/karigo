# Task 207B-H1 Ride Enum Migration Recovery

## Production Error

Production `prisma migrate deploy` failed with P3009 because migration
`20260801100000_task207b_production_rides_and_application_trash` was recorded
as failed.

The failing migration added enum value `ACTIVE` to `TaxiDriverProfileStatus`
and then immediately updated `taxi_driver_profiles.status` to `ACTIVE` in the
same migration. PostgreSQL does not allow a newly added enum value to be used
until the transaction that added it has committed.

## Fix

The failed migration now only adds the enum value and keeps the remaining
replay-safe Task 207B changes.

The profile status conversion is moved to:

```text
services/backend-api/prisma/migrations/20260801100500_task207b_activate_ride_captain_profiles/migration.sql
```

That second migration runs after the first migration commits:

```sql
UPDATE "taxi_driver_profiles"
SET "status" = 'ACTIVE'
WHERE "status" = 'ACTIVE_TEST';
```

Do not drop `ACTIVE_TEST` from the PostgreSQL enum during this recovery task.

## Production Recovery Command

Before rerunning deploy, run the Prisma recovery command against production:

```bash
npx prisma migrate resolve --rolled-back 20260801100000_task207b_production_rides_and_application_trash
```

Then rerun:

```bash
npx prisma migrate deploy
```

Do not reset the database, use `prisma db push`, delete `_prisma_migrations`
records manually, mark the failed migration applied, or delete Captain/Ride
records.

## Partial-Application Safety

The repaired first migration is replay-safe for production states where some
statements may already exist:

- `ACTIVE` enum value uses `ADD VALUE IF NOT EXISTS`.
- Trash columns use `ADD COLUMN IF NOT EXISTS`.
- Trash indexes use `CREATE INDEX IF NOT EXISTS`.
- `CaptainWorkMode` and `CaptainWorkLockStage` are guarded with
  `duplicate_object` handlers.
- `captain_work_states` uses `CREATE TABLE IF NOT EXISTS`.
- Work-state backfill uses `ON CONFLICT ("userId") DO NOTHING`.

## Render Commands

Render should not run migrations in both Build and Pre-Deploy.

If the Render root is `services/backend-api`:

```text
Build Command: npm ci && npx prisma generate && npm run build
Pre-Deploy Command: npx prisma migrate deploy
Start Command: npm run start:prod
```

If the Render root is the monorepo root:

```text
Build Command: npm ci && npx prisma generate --schema services/backend-api/prisma/schema.prisma && npm run build --workspace @karigo/backend-api
Pre-Deploy Command: npx prisma migrate deploy --schema services/backend-api/prisma/schema.prisma
Start Command: cd services/backend-api && npm run start:prod
```

## Verification

Run:

```bash
npm run verify:task207b-migration --workspace @karigo/backend-api
```

For a disposable PostgreSQL database restored to the state immediately before
Task 207B, set:

```text
TASK207B_MIGRATION_TEST_DATABASE_URL=<disposable PostgreSQL URL>
TASK207B_MIGRATION_TEST_CONFIRM=apply
```

Then rerun the verifier. Do not use the production database for this disposable
test.
