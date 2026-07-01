# Local Development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `npm install`.
4. Generate Prisma Client with `npm run db:generate`.
5. Create the first migration with `npm run db:migrate`.
6. Start the API with `npm run dev:api`.

Local defaults:

| Service | URL |
| --- | --- |
| Backend API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/api/docs` |
| Vendor dashboard | `http://localhost:3000` |
| Admin portal | `http://localhost:3001` |

Never commit real secrets, production database URLs or payment gateway keys.

