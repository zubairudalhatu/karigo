# Task 160 - Backend Render Compiled Entrypoint

Date: 2026-07-18

## Purpose

Record the corrected Render startup command after the Task 159 copy-based fix exposed a relative import failure:

```text
Cannot find module './app.module'
Require stack:
- /opt/render/project/src/services/backend-api/dist/main.js
```

## Root Cause

The Nest build emits compiled backend files together under:

```text
services/backend-api/dist/services/backend-api/src/
```

Copying only:

```text
dist/services/backend-api/src/main.js
```

to:

```text
dist/main.js
```

breaks relative imports such as `./app.module`, because the sibling compiled files remain in the nested build output directory.

## Correct Compiled Entrypoint

The backend production entrypoint is:

```text
services/backend-api/dist/services/backend-api/src/main.js
```

The backend `start:prod` script now runs:

```text
node dist/services/backend-api/src/main.js
```

## Render Commands

If Render uses `services/backend-api` as the service root directory, use:

```text
Build Command: npm ci && npx prisma generate && npm run build
Pre-Deploy Command: npx prisma migrate deploy
Start Command: npm run start:prod
```

The verifier now confirms the real compiled entrypoint exists and does not copy or move `main.js`.

## Task 205 Compatibility Note

During Task 205 deployment verification, the live Render service appeared to keep
serving the older route table after `main` was pushed. A likely operational cause is
an existing Render start command still pointing at:

```text
node dist/main
```

or, from the monorepo root:

```text
node services/backend-api/dist/main
```

The build verifier now writes a small compatibility entrypoint at `dist/main.js`
that requires the real compiled entrypoint:

```text
./services/backend-api/src/main.js
```

This is not a copy of `main.js`; it keeps the compiled module beside its relative
dependencies and allows both the preferred `npm run start:prod` command and the
older Render command to start the current build safely.

## Safety

- No secrets are stored in Git.
- No payment logic changed.
- No live payment activation changed.
- No Prisma migration is required.
- Admin Portal, Customer App, Captain App, Vendor Dashboard and Website do not require redeploy for this fix.
