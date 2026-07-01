# Private Staging Deployment Decision Record

## Purpose

Record the concrete private staging deployment choices for KariGO before any staging
simulation is treated as executed evidence.

## Current Decision Status

Status: **Pending deployment owner input**.

No backend host, database, web-dashboard host, mobile test-build channel, private staging
domain, or secret-manager location has been supplied in this repository. Do not mark
private staging as provisioned until this record is completed by the responsible
technical owner.

## Required Deployment Inputs

| Input | Selected value | Status | Notes |
| --- | --- | --- | --- |
| Backend hosting environment | TBD | Pending | Must support Node.js 20, HTTPS, env secrets, health checks, logs, rollback |
| PostgreSQL staging database | TBD | Pending | Must be separate from development and production |
| Web dashboard hosting | TBD | Pending | Must host vendor dashboard and admin portal with restricted staging URLs |
| Mobile test-build approach | TBD | Pending | Expo preview/dev builds for approved internal devices only |
| Staging API URL | TBD | Pending | Do not commit private hostnames if access-controlled |
| Vendor dashboard staging URL | TBD | Pending | Configure CORS and dashboard env through deployment platform |
| Admin portal staging URL | TBD | Pending | Configure CORS and dashboard env through deployment platform |
| Customer app API base URL | TBD | Pending | Set through Expo staging configuration outside Git |
| Rider app API base URL | TBD | Pending | Set through Expo staging configuration outside Git |
| Secret storage location | TBD | Pending | Use deployment platform secret manager or equivalent |
| Responsible technical owner | TBD | Pending | Must sign off provisioning and rollback readiness |

## Required Staging Provider Mode

Use these provider modes for initial private staging:

```env
APP_ENV=staging
PAYMENT_PROVIDER=mock
OTP_PROVIDER=mock
SMS_PROVIDER=mock
EMAIL_PROVIDER=mock
WHATSAPP_PROVIDER=mock
PUSH_PROVIDER=mock
```

Sandbox providers must remain disabled until their individual activation decision logs
are approved and secrets are configured only in the staging secret manager.

## Security Rules

- Do not commit deployment tokens, private database URLs, provider credentials, private
  domains, or real customer/vendor/rider data.
- Do not reuse local development JWT secrets or default passwords in staging.
- Store temporary demo credentials outside this repository.
- Keep staging private and unpromoted.

## Decision Outcome

Current outcome: **waiting for staging platform selection and technical owner approval**.
