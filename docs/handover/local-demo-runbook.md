# Local Demo Runbook

## Required Tools

- Node.js 20+, npm 10+
- PostgreSQL 16+ or Docker Desktop
- Android/iOS simulator, Expo Go, or web-capable Expo environment for mobile demos

## Setup

```powershell
Copy-Item services/backend-api/.env.example services/backend-api/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

If Docker is unavailable, start a local PostgreSQL instance and create the database
referenced by `DATABASE_URL`.

## Start The Demo

Open separate terminals:

```powershell
npm run dev:api
npm run dev:customer
npm run dev:rider
npm run dev:vendor
npm run dev:admin
```

- API: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health`
- Swagger: `http://localhost:4000/api/docs`
- Vendor dashboard: `http://localhost:3000`
- Admin portal: `http://localhost:3001`

For a physical Expo device, replace `localhost` in the mobile app environment with the
development machine's LAN IP.

## Demo Accounts

Use only the safe development account placeholders documented in
`docs/deployment/local-runbook.md`. Never copy real production credentials into this
document or repository. Rerun `npm run db:seed` if required demo users/products/promo are
missing.

## Demo Flow Order

Follow `docs/demo/demo-script.md`: customer order and mock payment, vendor fulfilment,
admin dispatch, rider completion with OTP, then support/reporting.

## Verification Before Presenting

```powershell
npm run db:validate
npm run typecheck
npm run test --workspace @karigo/backend-api
npm run build --workspace @karigo/backend-api
npm run test:e2e:smoke --workspace @karigo/backend-api
```

## Common Errors And Fixes

- **Database connection failed:** verify PostgreSQL is running and `DATABASE_URL` matches.
- **Migration/Prisma client error:** run `npm run db:generate` and `npm run db:migrate`.
- **Missing demo data:** run `npm run db:seed`.
- **Mobile app cannot reach API:** use the machine LAN IP and confirm firewall/CORS.
- **Port already in use:** stop the existing process or change the local app port.
- **Expired/invalid session:** log out, clear the local development token, and log in again.
- **Mock payment unavailable:** confirm `PAYMENT_PROVIDER=mock`.
- **No external message arrives:** expected; SMS/email/WhatsApp/push remain mocked.
