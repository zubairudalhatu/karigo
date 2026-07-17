# Task 153 - Captain Android Release-Candidate Rebuild Record

Date: 2026-07-17

## Purpose

Record the KariGO Captain Android production release-candidate rebuild after Task 152 UI, session persistence and application-flow improvements.

This task generated a Captain Android App Bundle only. It did not rebuild the Customer App, submit to Google Play, publish to production, activate live payments, activate live rides or commit secrets.

## Source Commit

```text
Commit: b944904
Message: feat: improve captain app release candidate experience
```

## Build Scope

| App | Platform | Profile | Package | Channel | Artifact |
| --- | --- | --- | --- | --- | --- |
| KariGO Captain App | Android | `captain-production` | `com.karigo.rider` | `captain-production` | Android App Bundle (`.aab`) |

Customer App was not rebuilt in this task.

## Build Command Executed

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Build Result

| EAS project | Previous Captain build | New Captain build | Result | Artifact status |
| --- | --- | --- | --- | --- |
| `@zamkah/karigo-rider` | `6f0bea0e-9402-4102-bde4-4afc05c078fe` | `79123804-7a58-45ad-807e-d9d87dffea1f` | Passed | Android App Bundle generated |

The previous Task 149 Captain AAB is now superseded for closed testing by the Task 153 build.

Direct artifact download URLs are intentionally not committed to Git. Release operators should retrieve the AAB from the authenticated Expo dashboard/build page or approved private release storage.

## Build Configuration Confirmed

```text
Profile: captain-production
Distribution: store
Android output: app-bundle
Package: com.karigo.rider
Channel: captain-production
APP_VARIANT: production
API base URL: https://karigo-8htn.onrender.com/api/v1
```

## Safety Guardrails

- Production publishing was not performed.
- Google Play open or production track was not used.
- Customer App was not rebuilt.
- Backend, Admin Portal, Vendor Dashboard and Website were not changed.
- Live payments remain disabled.
- Live ride-hailing and ride dispatch remain disabled.
- No `.env` files, secrets, AAB/APK files or direct artifact URLs were committed.

## Current Decision

```text
Captain Android RC rebuild: Passed
Captain AAB for closed testing update: Generated
Customer Android RC build: Unchanged
Google Play closed/internal testing upload: Pending operator action
Production publishing: Not approved
Live payment activation: Not approved
```
