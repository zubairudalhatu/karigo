# Render Backend Runtime Notes

## Runtime Commands

Use these commands for the KariGO backend service on Render:

- Build Command: `npm ci && npx prisma generate --schema services/backend-api/prisma/schema.prisma && npx prisma migrate deploy --schema services/backend-api/prisma/schema.prisma && npm run build --workspace @karigo/backend-api`
- Preferred Start Command: `cd services/backend-api && npm run start:prod`
- Compatibility Start Command: `node services/backend-api/dist/main`

If Render runs from `services/backend-api` as the service root instead of the monorepo
root, use:

- Build Command: `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- Preferred Start Command: `npm run start:prod`
- Compatibility Start Command: `node dist/main`

## Port Binding

Render injects the runtime port through the `PORT` environment variable. The backend
startup now prioritizes `process.env.PORT`, falls back to `APP_PORT`, then falls back to
`4000`.

The Nest application binds explicitly to `0.0.0.0` so Render can detect the open port.
The effective port is logged after startup.

## Why Not `nest start`

Do not use `npm run start` / `nest start` for staging or production on Render. `nest start`
loads the Nest CLI and TypeScript tooling at runtime, which is heavier and can trigger
JavaScript heap pressure on constrained instances.

Use the package production script instead:

```bash
npm run start:prod
```

`start:prod` runs the real compiled Nest entrypoint:

```bash
node dist/services/backend-api/src/main.js
```

For Render services that are still configured with the old `dist/main` path, the
backend build now writes a small compatibility entrypoint at `dist/main.js`. That
file requires `./services/backend-api/src/main.js` and does not copy the compiled
Nest entrypoint, so relative imports such as `./app.module` continue to resolve.

## Node Version

Use Node.js 22 for staging and production. The monorepo includes:

- `.node-version` with `22`
- root `package.json` engines set to `22.x`

## Security And Providers

- Do not commit secrets, database URLs, API keys, tokens, or passwords.
- Configure environment variables only in Render's environment settings or secret store.
- Keep mock providers active for staging unless a sandbox provider has been explicitly
  approved and configured securely.
- Live payment, SMS, email, WhatsApp, push, and bank-transfer providers remain disabled.
