# KariGO Secure Demo Access Pack - Task 62

Date: 10 July 2026
Environment: Live staging

This pack explains how KariGO testers should access demo accounts for credentialed QA without exposing passwords, access tokens, delivery OTPs or provider credentials in Git, screenshots, terminal logs or chat messages.

## Purpose

Tasks 60 and 61 confirmed that the remaining blocker before controlled soft launch is:

```text
Full credentialed mobile E2E evidence is still required before controlled soft launch.
```

This document gives the team a safe access process so that real manual QA can proceed without weakening security.

## Staging Surfaces

| Surface | URL or channel |
|---|---|
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` |
| Public website | `https://www.karigo.com.ng` |
| Admin Portal | `https://admin.karigo.com.ng` |
| Vendor Dashboard | `https://vendor.karigo.com.ng` |
| Customer App | EAS update branch `customer-staging` |
| Rider App | EAS update branch `rider-staging` |

## Demo Account Reference

Use `docs/deployment/karigo-staging-demo-accounts.md` as the source of truth for seeded demo phone numbers and personas.

| Persona | Login surface | Login phone source | Password source |
|---|---|---|---|
| Super Admin | Admin Portal | `SUPER_ADMIN_PHONE`, default documented in demo account register | `SUPER_ADMIN_PASSWORD`, fallback `SEED_DEMO_PASSWORD` |
| Operations Admin | Admin Portal | Demo account register | `SEED_DEMO_PASSWORD` |
| Demo Customer | Customer App | Demo account register | `SEED_DEMO_PASSWORD` |
| Demo Rider | Rider App | Demo account register | `SEED_DEMO_PASSWORD` |
| Demo Food Vendor | Vendor Dashboard | Demo account register | `SEED_DEMO_PASSWORD` |
| Demo Grocery Vendor | Vendor Dashboard | Demo account register | `SEED_DEMO_PASSWORD` |
| Demo Market Vendor | Vendor Dashboard | Demo account register | `SEED_DEMO_PASSWORD` |

Do not copy password values into this file. Testers should retrieve them through an approved secret manager or direct private handoff from the staging administrator.

## Approved Credential Handling

Use one of these safe methods:

1. Password vault
   - Store demo password values in an approved password manager.
   - Share access only with named QA testers.
   - Revoke access after the QA window if needed.

2. Human entry
   - A staging administrator enters passwords directly on test devices.
   - Testers do not see, copy or record the value.

3. Local environment variables for API testing
   - A tester may set local variables before running private API checks.
   - Do not echo or print variable values.
   - Do not paste shell history, tokens or request bodies into Git.

## Forbidden

- Do not commit passwords.
- Do not paste passwords into documentation, issue comments, chat or terminal output.
- Do not record bearer tokens.
- Do not record raw delivery OTP values.
- Do not screenshot password fields, OTP cards, provider dashboards or secret-manager screens.
- Do not use real customer, vendor or rider data.
- Do not activate live payment, SMS, email, WhatsApp, push, Taxi, Pharmacy or live Bills & Utilities during QA.

## Credential Reset Path

If demo passwords do not work, do not edit code or documentation with password values.

Use the approved staging-only reset mechanism:

1. In Render staging environment variables, set `APP_ENV=staging`.
2. Set `STAGING_RESET_DEMO_CREDENTIALS=true`.
3. Set password variables securely in Render:
   - `SEED_DEMO_PASSWORD`
   - `SUPER_ADMIN_PASSWORD`, if Super Admin should differ
4. Run the staging seed once.
5. Immediately set `STAGING_RESET_DEMO_CREDENTIALS=false` or remove it.
6. Retest login.
7. Do not record the password value in any QA evidence.

## Access Handoff Checklist

| Item | Owner | Status |
|---|---|---|
| QA testers identified | QA Lead | Pending |
| Test devices assigned | QA Lead | Pending |
| Customer staging app installed/updated | Mobile QA | Pending |
| Rider staging app installed/updated | Mobile QA | Pending |
| Admin password available through secure channel | Staging Admin | Pending |
| Demo password available through secure channel | Staging Admin | Pending |
| Password reset mode confirmed off after seed | Staging Admin | Pending |
| Evidence storage location approved | QA Lead | Pending |
| No-secret evidence rules reviewed | QA Lead | Pending |

## Completion Criteria

Credential access is ready when:

- Every tester can log in to the assigned role without receiving password values in Git or chat.
- Customer and Rider apps are installed and point to staging.
- Admin and Vendor branded domains load and authenticate.
- Testers understand what must be masked in evidence.
- A QA lead confirms that no secret values were recorded.
