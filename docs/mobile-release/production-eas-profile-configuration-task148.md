# Task 148 - Production EAS Profile Configuration

Date: 2026-07-17

## Purpose

Record the safe production release-candidate EAS profile configuration for the KariGO Customer App and KariGO Captain App.

This task configures build profiles only. It does not run production builds, publish apps to stores, activate live payments, add secrets, or change backend/provider modes.

## Scope

Configured apps:

- Customer App: `apps/customer-app`
- KariGO Captain App: `apps/rider-app`

Out of scope:

- app-store submission;
- live Paystack, Monnify or Squad activation;
- payment-provider secret handling;
- backend, Admin Portal, Vendor Dashboard and website feature changes;
- APK/AAB artifact commits.

## Existing Configuration Reviewed

| App | Dynamic config | Static app config | Existing staging profile |
| --- | --- | --- | --- |
| Customer App | `apps/customer-app/app.config.ts` | `apps/customer-app/app.json` | `customer-staging` |
| KariGO Captain App | `apps/rider-app/app.config.ts` | `apps/rider-app/app.json` | `rider-staging` |

The dynamic `app.config.ts` files remain the authoritative Expo configuration used by EAS.

## Production Identity Review

| App | Production app name | Android package | iOS bundle identifier | Expo slug |
| --- | --- | --- | --- | --- |
| Customer App | `KariGO Customer` | `com.karigo.customer` | `com.karigo.customer` | `karigo-customer` |
| KariGO Captain App | `KariGO Captain` | `com.karigo.rider` | `com.karigo.rider` | `karigo-rider` |

Staging identities remain unchanged:

- Customer staging Android/iOS: `com.karigo.customer.staging`
- Captain staging Android/iOS: `com.karigo.rider.staging`

## Profiles Added

### Customer App

Profile:

```text
customer-production
```

Configured behavior:

- `distribution=store`
- `channel=customer-production`
- Android output type: app bundle (`.aab`)
- `APP_VARIANT=production`
- `EXPO_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1`

### KariGO Captain App

Profile:

```text
captain-production
```

Configured behavior:

- `distribution=store`
- `channel=captain-production`
- Android output type: app bundle (`.aab`)
- `APP_VARIANT=production`
- `EXPO_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1`

## API Base URL Decision

The release-candidate profiles use the current controlled KariGO backend URL:

```text
https://karigo-8htn.onrender.com/api/v1
```

This is a public API base URL, not a secret.

Before public store submission, operations should confirm whether the app should continue using the Render URL or move to an approved branded production API domain. If a branded API domain is approved later, update only the public API base URL and rerun release-candidate validation.

## Payment Safety

Live payments remain disabled.

The mobile profiles do not include payment secret keys. Payment provider secrets must remain server-side only.

Current payment posture:

```text
Mock payment: Available
Monnify Sandbox: Supported
Paystack Test Mode: Supported
Squad: Deferred for customer checkout
Live payments: Disabled
```

## Release-Candidate Build Commands

Do not run these commands until release-candidate build approval is given.

Customer Android release candidate:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production
```

Customer iOS release candidate:

```powershell
cd apps/customer-app
npx eas-cli build --platform ios --profile customer-production
```

Captain Android release candidate:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production
```

Captain iOS release candidate:

```powershell
cd apps/rider-app
npx eas-cli build --platform ios --profile captain-production
```

## Store Submission Guardrail

Building a release candidate is not the same as publishing.

Before any store submission:

- complete app metadata and screenshots;
- confirm privacy labels;
- confirm support and legal URLs;
- confirm production API URL and CORS posture;
- complete release-candidate QA;
- record Go/No-Go approval;
- confirm live payments remain disabled unless separately approved.

## Current Decision

```text
Production EAS profiles: Configured
Production builds: Not run
Store submission: Not approved
Live payments: Disabled
Next step: run release-candidate validation, then request explicit approval before building
```
