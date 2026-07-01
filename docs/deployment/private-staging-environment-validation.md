# Private Staging Environment Validation

Use this document after private staging is provisioned. A checkbox may only be marked
complete after execution evidence is recorded in
`docs/qa/private-staging-evidence-register.md`.

## Backend And Database

- [ ] Backend deployed with `APP_ENV=staging`
- [ ] Backend API URL configured
- [ ] Dedicated staging PostgreSQL database connected
- [ ] Prisma migrations completed against staging database
- [ ] Prisma client generated in deployment build
- [ ] Seed process completed using staging-safe data
- [ ] API prefix remains `/api/v1`
- [ ] Health endpoint works at `/api/v1/health`
- [ ] Swagger/API docs work at `/api/docs` or are intentionally restricted
- [ ] Logging is available and does not expose passwords, OTP values, tokens, or provider secrets
- [ ] Error responses are user-safe and do not expose stack traces

## Frontend And CORS

- [ ] Customer app points to staging API
- [ ] Rider app points to staging API
- [ ] Vendor dashboard points to staging API
- [ ] Admin portal points to staging API
- [ ] CORS is restricted to staging clients
- [ ] KariGO logo/assets load on all product surfaces

## Provider Configuration

- [ ] `PAYMENT_PROVIDER=mock`
- [ ] `OTP_PROVIDER=mock`
- [ ] `SMS_PROVIDER=mock`
- [ ] `EMAIL_PROVIDER=mock`
- [ ] `WHATSAPP_PROVIDER=mock`
- [ ] `PUSH_PROVIDER=mock`
- [ ] Sandbox/live provider credentials are not configured for this initial staging pass

## Secrets And Access

- [ ] JWT secret configured through secret manager
- [ ] Seed/demo passwords configured through secret manager or secure handover
- [ ] No development-only credentials reused
- [ ] No real credentials committed
- [ ] Admin/staging access is limited to internal testers
- [ ] Rollback/redeploy process documented

## Current Validation Status

Status: **Blocked**.

Reason: no private staging host, staging database, or secret-manager access has been
provided to this workspace.
