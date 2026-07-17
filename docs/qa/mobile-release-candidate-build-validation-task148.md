# Task 148 - Mobile Release-Candidate Build Validation

Date: 2026-07-17

## Purpose

Define the validation checklist for the newly configured production EAS release-candidate profiles.

This document is for validation and evidence capture only. It does not authorize app-store submission or live payment activation.

## Profiles Under Test

| App | Profile | Expected Android artifact | Channel |
| --- | --- | --- | --- |
| Customer App | `customer-production` | Android App Bundle (`.aab`) | `customer-production` |
| KariGO Captain App | `captain-production` | Android App Bundle (`.aab`) | `captain-production` |

## Pre-Build Validation Checklist

- [ ] Customer staging profile remains unchanged.
- [ ] Captain staging profile remains unchanged.
- [ ] Customer production profile exists.
- [ ] Captain production profile exists.
- [ ] Production profiles use `distribution=store`.
- [ ] Production Android builds use app bundle output.
- [ ] Production profiles do not contain API keys or provider secrets.
- [ ] Mobile apps use only the public API base URL.
- [ ] Live payments remain disabled server-side.
- [ ] Squad by GTBank remains gated until live environment verification and approval are complete.
- [ ] App-store submission is not started.

## Expo Config Validation

Customer App:

```powershell
cd apps/customer-app
$env:APP_VARIANT = "production"
$env:EAS_BUILD_PROFILE = "customer-production"
$env:EXPO_PUBLIC_API_BASE_URL = "https://karigo-8htn.onrender.com/api/v1"
npx --no-install expo config --type public
```

Expected:

- app name: `KariGO Customer`;
- Android package: `com.karigo.customer`;
- iOS bundle identifier: `com.karigo.customer`;
- EAS project ID present;
- updates URL present;
- API base URL present.

KariGO Captain App:

```powershell
cd apps/rider-app
$env:APP_VARIANT = "production"
$env:EAS_BUILD_PROFILE = "captain-production"
$env:EXPO_PUBLIC_API_BASE_URL = "https://karigo-8htn.onrender.com/api/v1"
npx --no-install expo config --type public
```

Expected:

- app name: `KariGO Captain`;
- Android package: `com.karigo.rider`;
- iOS bundle identifier: `com.karigo.rider`;
- EAS project ID present;
- updates URL present;
- API base URL present.

## Release-Candidate Build Evidence Template

| Field | Customer App | KariGO Captain App |
| --- | --- | --- |
| Profile |  |  |
| Build platform |  |  |
| Build command |  |  |
| Commit hash |  |  |
| EAS build ID |  |  |
| Artifact type |  |  |
| Build status | Passed / Failed / Blocked | Passed / Failed / Blocked |
| Installed/tested by |  |  |
| Smoke test result |  |  |
| Critical issues |  |  |
| Release decision | Go / No-Go / Hold | Go / No-Go / Hold |

## Post-Build Smoke Tests

Customer App:

- [ ] App installs from release-candidate artifact.
- [ ] App opens with production app name.
- [ ] Login and signup route correctly.
- [ ] OTP/account activation path works according to approved pilot mode.
- [ ] Home browsing works.
- [ ] Vendor browsing works.
- [ ] Checkout uses approved payment mode only.
- [ ] Live payment is not accidentally enabled.
- [ ] SME Services request flow remains controlled.
- [ ] Wallet/referral features remain visibility/review only.

KariGO Captain App:

- [ ] App installs from release-candidate artifact.
- [ ] App opens with Captain branding.
- [ ] Delivery Captain login works.
- [ ] Availability controls work.
- [ ] Assigned jobs list loads.
- [ ] Job status progression works.
- [ ] Delivery code completion works.
- [ ] Ride Captain mode remains readiness-only.
- [ ] Payout/withdrawal automation is not enabled.

## Current Status

```text
Release-candidate profiles: Configured
Android release-candidate builds: Generated in Task 149
Store submission: Not approved
Live payments: Disabled
```

Task 149 Android build results:

| App | Build ID | Result |
| --- | --- | --- |
| Customer App | `ec1716bb-258c-4022-bb8a-1708895920fb` | Passed |
| KariGO Captain App | `6f0bea0e-9402-4102-bde4-4afc05c078fe` | Passed |
