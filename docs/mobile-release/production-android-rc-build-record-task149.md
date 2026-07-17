# Task 149 - Production Android Release-Candidate Build Record

Date: 2026-07-17

## Purpose

Record the approved Android production release-candidate EAS builds for KariGO Customer App and KariGO Captain App.

This task generated Android build artifacts only. It did not submit apps to Google Play or Apple App Store, activate live payments, commit secrets, or publish any public release.

## Source Commit

```text
Commit: 2b4d673
Message: chore: configure production eas release profiles
```

## Build Scope

| App | Platform | Profile | Package | Channel | Expected artifact |
| --- | --- | --- | --- | --- | --- |
| Customer App | Android | `customer-production` | `com.karigo.customer` | `customer-production` | `.aab` |
| KariGO Captain App | Android | `captain-production` | `com.karigo.rider` | `captain-production` | `.aab` |

iOS builds were not run in this task.

## Build Commands Executed

Customer App:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

KariGO Captain App:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Build Results

| App | EAS project | EAS build ID | Result | Artifact |
| --- | --- | --- | --- | --- |
| Customer App | `@zamkah/karigo-customer` | `ec1716bb-258c-4022-bb8a-1708895920fb` | Passed | Android App Bundle generated |
| KariGO Captain App | `@zamkah/karigo-rider` | `6f0bea0e-9402-4102-bde4-4afc05c078fe` | Passed | Android App Bundle generated |

Direct artifact download URLs are intentionally not committed to Git. The release manager should retrieve artifacts from the authenticated Expo dashboard/build pages.

## EAS Build Side Effects

Customer App:

- Created/confirmed EAS Update channel: `customer-production`
- Created/confirmed EAS Update branch: `customer-production`
- Used remote Android credentials on Expo servers
- Created Android keystore in Expo remote credentials

KariGO Captain App:

- Created/confirmed EAS Update channel: `captain-production`
- Created/confirmed EAS Update branch: `captain-production`
- Used remote Android credentials on Expo servers
- Created Android keystore in Expo remote credentials

No keystore files or credentials were written to the repository.

## Runtime Configuration Confirmed

```text
API base URL: https://karigo-8htn.onrender.com/api/v1
Live payments: Disabled
Mock payment: Available
Monnify: Sandbox-ready
Paystack: Test-mode-ready
Squad: Deferred from customer checkout
Store submission: Not performed
```

## Current Decision

```text
Customer Android release-candidate artifact: Generated
Captain Android release-candidate artifact: Generated
iOS release-candidate artifacts: Not generated
Google Play submission: Not approved
Apple App Store submission: Not approved
Live payment activation: Not approved
Next step: perform artifact QA and store-track preparation without publishing
```
