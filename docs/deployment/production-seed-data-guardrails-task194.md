# Production Seed Data Guardrails - Task 194

KariGO seed data is now split between essential bootstrap data and demo marketplace data.

## Production Behaviour

When the backend seed runs with `APP_ENV=production` or `NODE_ENV=production`:

- the Super Admin bootstrap record can be ensured;
- `SUPER_ADMIN_PASSWORD` is required;
- demo Operations Admin, Vendor, Customer and Captain accounts are skipped by default;
- demo vendors, products, seeded orders and `DEMO_` utility catalogue records are skipped by default.

Production demo seed data requires both explicit flags:

```text
ALLOW_DEMO_SEED_DATA=true
SEED_PRODUCTION_DEMO_DATA=true
```

Both flags should remain unset or `false` for normal production.

## Non-Production Behaviour

Development and staging continue to seed demo data by default so QA workflows remain usable.

To block demo data in a non-production environment, set:

```text
ALLOW_DEMO_SEED_DATA=false
```

Staging demo credential reset remains separately gated by:

```text
APP_ENV=staging
STAGING_RESET_DEMO_CREDENTIALS=true
```

## Required Production Seed Variables

Use host environment variables or an approved secret manager only.

```text
SUPER_ADMIN_NAME
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PHONE
SUPER_ADMIN_PASSWORD
ALLOW_DEMO_SEED_DATA=false
SEED_PRODUCTION_DEMO_DATA=false
```

Do not use `SEED_DEMO_PASSWORD` as a production admin password.

## Cleanup Command

Use the production demo cleanup runbook before wider public launch:

```text
docs/operations/production-demo-data-cleanup-task194.md
```

The cleanup command is:

```bash
npm run cleanup:production-demo-data --workspace @karigo/backend-api
```

It defaults to dry-run and requires confirmation flags before applying changes.

## Verification

After deployment:

- run Prisma seed in a non-production database and confirm demo data still appears;
- run Prisma seed in a production-like database with demo flags disabled and confirm only Super Admin is ensured;
- confirm Customer App, Customer Web Portal and website do not rely on seeded vendor names such as `Kano Kitchen`;
- confirm production environment values do not contain demo passwords or committed credentials.
