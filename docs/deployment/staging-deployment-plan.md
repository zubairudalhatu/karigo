# Staging Deployment Plan

## Purpose

Staging is a private, synthetic-data environment for internal management demos,
technical testing, vendor/rider onboarding trials, later payment/SMS sandbox testing,
and controlled pre-launch review. It must never be presented as production.

## Components

- NestJS backend API and dedicated staging PostgreSQL database
- Customer and rider Expo preview/test builds
- Vendor dashboard and admin portal staging URLs
- Mock payment, OTP/SMS, email, WhatsApp, and push providers
- Staging-safe seeded demo accounts, vendor, products, address, parcel order, and promo

## Generic Hosting Recommendations

- Backend: container/PaaS host supporting Node.js 20, HTTPS, environment secrets, logs,
  health checks, and rollback.
- Database: managed PostgreSQL with encrypted connections, backups, and restricted
  network access.
- Web dashboards: a Next.js-compatible managed host with separate staging domains.
- Mobile: Expo development/preview builds distributed only to approved test devices.
- Monitoring: central application/error logs, uptime checks, database alerts, and an
  incident contact.

## Deployment Sequence

1. Provision private staging API, database, web URLs, secret storage, and monitoring.
2. Configure placeholder-only staging variables and restricted CORS.
3. Run `npm ci`, Prisma generation, validation, and `prisma migrate deploy`.
4. Run the staging-safe seed with a unique staging-only password.
5. Deploy/start the backend and verify health/Swagger decision.
6. Build/deploy the web dashboards and configure mobile preview builds.
7. Run the staging smoke script and complete the internal demo checklist.
8. Record findings in the staging known-issues register.

Keep all providers mocked until their separate sandbox approval gates are satisfied.
