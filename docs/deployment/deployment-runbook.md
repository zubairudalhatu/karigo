# Deployment Runbook

## 1. Prepare

1. Confirm the release commit and review `docs/qa/soft-launch-blockers.md`.
2. Provision PostgreSQL and create an empty application database.
3. Configure secrets in the hosting platform; do not upload `.env` files.
4. Set frontend API URLs to the production HTTPS API.

## 2. Install And Validate

```bash
npm ci
npm run db:generate
npm run db:validate
npm run typecheck
npm run test
npm run build
```

## 3. Database Migration

1. Take and verify a database backup.
2. Review pending migration SQL.
3. Run production migrations:

```bash
npx prisma migrate deploy --schema services/backend-api/prisma/schema.prisma
```

Do not run the development seed in production. Provision production admins through an approved one-time process with temporary credentials and forced rotation.

## 4. Start Backend

```bash
npm run start --workspace @karigo/backend-api
```

Verify:

```text
GET https://API_HOST/api/v1/health
GET https://API_HOST/api/docs  # only when approved
```

## 5. Build Product Surfaces

```bash
npx expo export --platform android --workspace apps/customer-app
npx expo export --platform android --workspace apps/rider-app
npm run build --workspace @karigo/vendor-dashboard
npm run build --workspace @karigo/admin-portal
```

Use the approved Expo/EAS signing and app-store process for installable releases. Deploy the web dashboard build outputs through the selected Next.js-compatible host.

## 6. Release Verification

1. Check health and API docs decision.
2. Log in with approved customer, vendor, rider, and admin test accounts.
3. Run the controlled mock-provider flow only in a non-public review environment.
4. Verify order, dispatch, support, promo, notification, report, and settlement views.
5. Confirm logs and alerts receive events without exposing secrets.

## 7. Rollback

1. Stop new traffic or place the service in maintenance mode.
2. Roll back application deployment to the last verified release.
3. For incompatible database changes, restore the verified pre-migration backup or deploy an approved forward-fix migration.
4. Recheck health, authentication, and one complete test order.
5. Record the incident using `docs/launch/incident-response-template.md`.
