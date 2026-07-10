# KariGO Demo Password Verification - Task 61

Date: 10 July 2026
Environment: Live staging

This document records the password-verification status for Task 61 without exposing password values. It should not contain real passwords, OTPs, access tokens or provider secrets.

## Demo Account Sources

The staging demo account matrix is documented in `docs/deployment/karigo-staging-demo-accounts.md`.

| Persona | Login phone source | Password source |
|---|---|---|
| Super Admin | `SUPER_ADMIN_PHONE`, default `+2348000000000` | `SUPER_ADMIN_PASSWORD`, falling back to `SEED_DEMO_PASSWORD` if unset |
| Operations Admin | `+2348000000001` | `SEED_DEMO_PASSWORD` |
| Demo Customer | `+2348000000201` | `SEED_DEMO_PASSWORD` |
| Demo Rider | `+2348000000401` | `SEED_DEMO_PASSWORD` |
| Demo Food Vendor | `+2348000000101` | `SEED_DEMO_PASSWORD` |
| Demo Grocery Vendor | `+2348000000102` | `SEED_DEMO_PASSWORD` |
| Demo Market Vendor | `+2348000000103` | `SEED_DEMO_PASSWORD` |

## Verification Attempt

The QA runner checked whether approved credential variables were present in the shell. Values were not printed.

| Variable | Present | Verification result |
|---|---:|---|
| `SEED_DEMO_PASSWORD` | No | Cannot verify demo customer/vendor/rider/admin passwords from this runner. |
| `SUPER_ADMIN_PASSWORD` | No | Cannot independently verify Super Admin password from this runner. |
| `STAGING_DEMO_PASSWORD` | No | No staging fallback password was available to this runner. |

## Safe Credential Procedure For Next Run

Use one of these approaches before rerunning credentialed QA:

1. Set `SEED_DEMO_PASSWORD` and, if needed, `SUPER_ADMIN_PASSWORD` in the local shell before launching the QA run.
2. Use an approved password vault and have a human tester enter credentials directly into the deployed apps.
3. If the staging hashes are stale, rerun the approved staging-only reset process using `STAGING_RESET_DEMO_CREDENTIALS=true`, then turn it off immediately.

Rules:

- Do not commit password values.
- Do not paste password values into docs, screenshots, terminal logs or issue comments.
- Do not print API bearer tokens.
- Do not record delivery OTP values.

## Result

Demo password verification is blocked for this automated Task 61 run. The next QA run must start with a secure credential source.
