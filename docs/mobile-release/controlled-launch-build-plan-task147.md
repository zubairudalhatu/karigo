# Task 147 - Controlled Launch Build Plan

Date: 2026-07-17

## Purpose

Define the controlled production-build plan for KariGO Customer App and KariGO Captain App.

This is a planning document only. It does not create store builds, submit binaries, configure credentials or publish apps.

## Launch Build Principles

- Keep staging APK builds separate from production store builds.
- Use `.aab` for Google Play store submission.
- Use iOS production builds through App Store Connect/TestFlight.
- Keep live payments disabled until a separate payment activation approval.
- Keep Squad hidden from customer checkout for launch.
- Keep Monnify primary and Paystack secondary for sandbox-readiness evidence.
- Do not put production secrets, API keys, app-store credentials, signing keys or `.env` files in Git.

## Current Build Configuration Status

| App | Current Working Profile | Store Profile Status |
| --- | --- | --- |
| Customer App | `customer-staging` internal Android APK | Production profile not configured |
| Customer App iOS | `customer-staging-ios-simulator` | TestFlight/store profile not configured |
| KariGO Captain App | `rider-staging` internal Android APK | Production profile not configured |
| KariGO Captain App iOS | `rider-staging-ios-simulator` | TestFlight/store profile not configured |

## Required Production Profiles

Future production EAS profiles should be added only after production API/base-domain approval.

Suggested profile names:

```text
customer-production
captain-production
```

Expected properties:

- `distribution` suitable for store submission.
- Android output as app bundle (`.aab`), not internal APK.
- Production app identifiers:
  - Customer Android: `com.karigo.customer`
  - Customer iOS: `com.karigo.customer`
  - Captain Android: `com.karigo.rider`
  - Captain iOS: `com.karigo.rider`
- `APP_VARIANT=production` or an approved equivalent.
- `EXPO_PUBLIC_API_BASE_URL` points to the approved production API base URL.
- No payment provider secret in mobile environment.
- No live provider flag unless separately approved.

## Future Build Commands After Profiles Exist

Customer Android store candidate:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production
```

Customer iOS TestFlight candidate:

```powershell
cd apps/customer-app
npx eas-cli build --platform ios --profile customer-production
```

Captain Android store candidate:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production
```

Captain iOS TestFlight candidate:

```powershell
cd apps/rider-app
npx eas-cli build --platform ios --profile captain-production
```

Do not run these commands until the profiles exist and the production API base URL is approved.

## Controlled Build Sequence

1. Freeze unrelated feature changes.
2. Confirm release commit hash.
3. Confirm staging QA signoff.
4. Confirm production API URL and CORS plan.
5. Add production EAS profiles in a separate engineering task.
6. Run local validation:
   - Customer typecheck/regression.
   - Captain typecheck/regression.
   - Expo config validation for both apps.
   - Expo Doctor for both apps.
7. Build Customer Android `.aab`.
8. Build Customer iOS/TestFlight binary.
9. Build Captain Android `.aab`.
10. Build Captain iOS/TestFlight binary.
11. Upload to internal/closed testing tracks.
12. Run store-distributed release-candidate QA.
13. Record Go/No-Go.
14. Only then prepare public store rollout.

## Release Channel And Update Policy

- Staging channels remain:
  - `customer-staging`
  - `rider-staging`
- Production channels should be separate.
- Production update channel names should be approved before use.
- Runtime version policy should remain consistent with existing app-version policy unless engineering approves a change.
- OTA updates must not introduce live payment or disabled service activation without normal release approval.

## Controlled Public Launch Plan

Recommended launch order:

1. Internal store-distributed testing.
2. Closed testing with approved staff/testers.
3. Limited Kano controlled release.
4. Gradual public expansion only after operations and support signoff.

## Rollback And Pause Rules

Pause release if:

- production API is unreachable;
- login/OTP/account activation fails;
- checkout cannot use Mock, Monnify Sandbox or Paystack Test Mode according to the approved mode;
- order status does not sync across Customer, Vendor, Admin and Captain surfaces;
- app build points at staging accidentally when production was intended;
- app build points at production accidentally during staging-only verification;
- secrets or OTPs appear in logs/evidence;
- store review raises privacy, safety, policy or payment claims issues.

Rollback actions:

- Stop rollout or keep build in closed/internal testing.
- Disable new public invitations.
- Keep Mock payment fallback available.
- Redeploy stable backend/Admin/Vendor portals if required.
- Use EAS Update only for safe JS fixes that do not require native changes.
- Build a new binary for native dependency/config changes.

## Current Decision

```text
Production store profiles: Not yet configured
Production store upload: Not approved
Controlled launch build planning: Ready
Next step: create production EAS profiles after production API/store metadata signoff
```
