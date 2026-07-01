# Local Runbook

## Requirements

- Node.js 20+
- PostgreSQL 16+ or Docker
- npm

## Database

Docker option:

```bash
docker compose up -d postgres
```

Windows PostgreSQL option:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\createdb.exe' -h localhost -U postgres karigo
```

Then:

```bash
npm install
npm run db:generate
npx prisma migrate dev --name local_setup --schema services/backend-api/prisma/schema.prisma
npm run db:seed
```

## Start Services

```bash
npm run dev:api
npm run dev:customer
npm run dev:rider
npm run dev:vendor
npm run dev:admin
```

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`
- Vendor dashboard: `http://localhost:3000`
- Admin portal: `http://localhost:3001`

For physical Expo devices, replace `localhost` in the app `.env` with the development machine's LAN IP.

## Development Accounts

All seeded accounts use password `ChangeMe123!`.

| Role | Phone |
|---|---|
| Super admin | `+2348000000000` |
| Vendor | `+2348000000101` |
| Customer | `+2348000000201` |
| Rider | `+2348000000401` |

These credentials are development-only and must never be used in production.

## Verification

```bash
npm run db:format
npm run db:generate
npm run db:validate
npm run test:e2e:smoke --workspace @karigo/backend-api
npm run typecheck
npm run test
npm run build
```
