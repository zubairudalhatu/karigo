# KariGO MVP Developer Handover

## Current Status

KariGO's NestJS backend and all four frontend surfaces are integrated and ready for an
internal demo using local PostgreSQL, mock payments, mock OTP delivery, in-app
notifications, and mock external notification channels.

The platform is not approved for a real-customer soft launch until the critical items in
`docs/handover/launch-blocker-audit.md` are closed.

## Project Structure

- `apps/customer-app`, `apps/rider-app`: Expo React Native applications
- `apps/vendor-dashboard`, `apps/admin-portal`: Next.js applications
- `services/backend-api`: NestJS API, Prisma schema/migration/seed, tests, Swagger
- `packages/shared-types`, `packages/ui-components`, `packages/config`: shared contracts,
  UI foundations, API client configuration, and brand assets
- `docs/`: API, QA, frontend, deployment, provider, launch, demo, and handover documents

## Start Here

1. `docs/handover/handover-package-index.md`
2. `docs/handover/mvp-scope-confirmation.md`
3. `docs/handover/launch-blocker-audit.md`
4. `docs/handover/local-demo-runbook.md`
5. `docs/handover/final-soft-launch-decision-checklist.md`

## Local Setup

```powershell
Copy-Item services/backend-api/.env.example services/backend-api/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
```

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`
- Vendor dashboard: `http://localhost:3000`
- Admin portal: `http://localhost:3001`

Run frontends with `npm run dev:customer`, `npm run dev:rider`, `npm run dev:vendor`,
and `npm run dev:admin`.

## Verification

```powershell
npm run db:format
npm run db:validate
npm run db:generate
npm run typecheck
npm run test
npm run build
npm run test:e2e:smoke --workspace @karigo/backend-api
```

There is no repository ESLint script yet. Mobile production validation currently uses
Expo Android export checks. See the final review documents for the latest evidence.

## Roles And Providers

Primary roles are `CUSTOMER`, `VENDOR`, `RIDER`, and `ADMIN`, with admin sub-roles for
operations, dispatch, finance, support, and marketing.

- Payment: mock; Paystack, Flutterwave, Monnify, and Squad are placeholders
- OTP/SMS: mock delivery; codes are hashed and development responses may expose mock OTP
- Notifications: persisted in-app activity plus mock external channels
- Settlements/payouts: records and manual admin mark-paid actions only
- Location: last-known/manual location; no real live GPS

## Security

Never commit `.env`, live provider keys, production passwords, tokens, or customer data.
Real secrets must be stored in an approved secret manager. Development seed accounts and
credentials must never be used in production.

## Next Recommended Phase

Select and implement the first production provider, starting with Paystack sandbox or an
approved Nigerian SMS OTP provider, while production infrastructure and device/security
readiness work proceeds in parallel.
