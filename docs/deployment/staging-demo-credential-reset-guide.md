# Staging Demo Credential Reset Guide

Use this guide only for the KariGO staging environment. Do not use it for production,
public launch, or any database containing real customer, vendor, rider, or admin users.

Do not commit password values, API keys, tokens, database URLs, Render screenshots, or
secret-manager exports to Git.

## Purpose

The staging seed can now update demo-account password hashes when explicitly instructed.
This is useful when the staging database has already been seeded but the intended demo
password does not match the existing password hash.

## Safety Rules

- Reset mode only works when `APP_ENV=staging`.
- Reset mode only targets the known synthetic demo accounts created by the seed.
- Reset mode does not print plaintext passwords.
- Reset mode must be turned off immediately after one successful seed run.
- Normal seed runs preserve existing demo-account password hashes.

## Required Render Environment Variables

Set these in the Render backend service environment.

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | Must be `staging` for reset mode to apply |
| `STAGING_RESET_DEMO_CREDENTIALS` | Set to `true` only for the one reset seed run |
| `SEED_DEMO_PASSWORD` | Password used for Operations Admin, Vendor, Rider and Customer demo users |
| `SUPER_ADMIN_PASSWORD` | Password used for the Super Admin demo user |
| `SUPER_ADMIN_PHONE` | Optional Super Admin login phone override |
| `SUPER_ADMIN_EMAIL` | Optional Super Admin email override |
| `SUPER_ADMIN_NAME` | Optional Super Admin display name override |

Do not place actual values in this document.

## One-Time Render Reset Procedure

1. Open the Render backend service.
2. Confirm `APP_ENV` is set to `staging`.
3. Set `SEED_DEMO_PASSWORD` to the intended secure staging demo password.
4. Set `SUPER_ADMIN_PASSWORD` to the intended secure staging Super Admin password.
5. Set `STAGING_RESET_DEMO_CREDENTIALS` to `true`.
6. Restart/redeploy the backend if Render requires it for environment changes.
7. Open a Render shell or one-off job.
8. From `services/backend-api`, run:

```bash
npm run seed
```

If running from the monorepo root, run:

```bash
npm run seed --workspace @karigo/backend-api
```

9. Confirm seed output includes:

```text
Demo Super Admin ensured
Demo Operations Admin ensured
Demo Vendor ensured
Demo Rider ensured
Demo Customer ensured
Credential reset applied: yes
```

10. Immediately set `STAGING_RESET_DEMO_CREDENTIALS` back to `false` or remove it.
11. Restart/redeploy the backend if Render requires it for environment changes.
12. Share staging credentials only through the approved secure handover channel.

## Normal Seed Procedure After Reset

After reset mode is disabled, rerunning the seed should report:

```text
Credential reset applied: no
```

Existing password hashes should be preserved.

## Rollback / Safety Notes

If reset mode was accidentally requested outside staging, the seed should skip credential
reset and print:

```text
Credential reset requested but skipped: APP_ENV must be staging.
```

If a staging login still fails after reset:

- Confirm the seed ran against the staging database, not a local database.
- Confirm the portal is using the staging backend API URL.
- Confirm the correct role is being used for the portal.
- Confirm `STAGING_RESET_DEMO_CREDENTIALS` was enabled for the seed run.
- Confirm the password used by the tester matches the secure Render secret.
