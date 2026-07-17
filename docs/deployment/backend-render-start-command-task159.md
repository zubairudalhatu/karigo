# Task 159 - Backend Render Start Command

Date: 2026-07-18

## Purpose

Record the Render startup fix for the KariGO backend after a deployment failed with:

```text
Cannot find module '/opt/render/project/src/services/backend-api/dist/main'
```

## Root Cause

A clean Nest build emitted the backend entrypoint under:

```text
services/backend-api/dist/services/backend-api/src/main.js
```

Render was starting from `services/backend-api` with:

```text
node dist/main
```

That command expects:

```text
services/backend-api/dist/main.js
```

## Repository Fix

The backend build now runs a post-build verifier:

```text
nest build && node scripts/verify-render-build.cjs
```

The verifier confirms `dist/main.js` exists. If Nest emits the entrypoint in a nested path, the verifier copies it to:

```text
dist/main.js
```

The production start script now uses:

```text
npm run start:prod
```

which runs:

```text
node dist/main.js
```

## Render Commands

If the Render service root directory is:

```text
services/backend-api
```

use:

```text
Build Command: npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
Start Command: npm run start:prod
```

If Render runs from the monorepo root, use the existing workspace-aware build and start commands that enter the backend package before starting.

## Validation

Local clean build confirmed:

```text
dist/main.js
dist/services/backend-api/src/main.js
```

The production entrypoint resolves successfully:

```text
node -e "console.log(require.resolve('./dist/main.js'))"
```

## Safety

- No secrets are stored in Git.
- No payment logic changed.
- No live payment activation changed.
- No Prisma migration is required.
