# Task 162 - Customer and Captain Android AAB Rebuild Record

Date: 18 July 2026

Purpose: record fresh Android production AAB builds for KariGO Customer App and KariGO Captain App after Task 161 launch polish.

Source commit before rebuild: `51f4634015ffd6af6316ffa475e6e140a33d6fc6`

Production publishing status: not approved.

## Build Summary

| App | Package | Version | Version code | EAS profile | Channel | EAS build ID | Status | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KariGO | `com.karigo.customer` | `0.1.0` | `2` | `customer-production` | `customer-production` | `229a04f0-1f1f-4fab-955a-3bd729321384` | Finished | AAB |
| KariGO Captain | `com.karigo.rider` | `0.1.0` | `3` | `captain-production` | `captain-production` | `968eae26-7b1e-41da-942c-a27bcd39a01f` | Finished | AAB |

Direct artifact URLs are intentionally not recorded in Git. Use the Expo dashboard build records above to download the AABs for Google Play internal testing.

## Version Code Changes

Customer App:

- Before: no explicit Android `versionCode` in dynamic config; previous Play upload context indicates the initial build may have used versionCode `1`.
- After: production `versionCode` set to `2`.
- Package remains `com.karigo.customer`.

Captain App:

- Before: production `versionCode` was `2`.
- After: production `versionCode` set to `3`.
- Package remains `com.karigo.rider`.

## Commands Run

Customer:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

Captain:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Included Task 161 Changes

Customer AAB includes:

- Updated KariGO icon/adaptive icon assets.
- Customer home/logo visibility polish.
- Live-mode Squad by GTBank checkout fallback.
- Kano and Abuja launch copy.
- Production package `com.karigo.customer`.

Captain AAB includes:

- Updated complete KariGO icon/adaptive icon assets.
- Captain Task 152/161 UI and session polish.
- Production package `com.karigo.rider`.

## Safety Notes

- AAB files were not committed.
- Direct artifact URLs were not committed.
- No `.env` files or secrets were committed.
- No production store publishing was performed.
- Live payment activation was not changed by this rebuild.
- Backend, Admin Portal, Vendor Dashboard and Website redeploys are not required for this task.
