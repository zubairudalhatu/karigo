# Mobile API 36 AAB Validation Checklist - Task 201

Date: 2026-07-27

## Purpose

Use this checklist before building and uploading KariGO Customer, Partner and Captain Android AABs for Google Play Internal Testing.

## Shared Pre-Build Checks

- [ ] No `.env` files, secrets, keystores, APKs, AABs, screenshots or direct artifact URLs are staged.
- [ ] `git diff --check` passes.
- [ ] App package name is unchanged.
- [ ] App production API base remains `https://karigo-8htn.onrender.com/api/v1`.
- [ ] Expo config shows `compileSdkVersion: 36`.
- [ ] Expo config shows `targetSdkVersion: 36`.
- [ ] Expo config shows `buildToolsVersion: 36.0.0`.
- [ ] App regression check passes.
- [ ] App typecheck passes.
- [ ] Expo Doctor passes or any warning is recorded before build.

## Customer App

Expected:

- Package: `com.karigo.customer`
- App name: KariGO
- Scheme: `karigo-customer`
- Profile: `customer-production`
- Artifact: Android AAB
- VersionCode: `10`
- Target API: `36`

Command:

```powershell
cd apps/customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

## Partner App

Expected:

- Package: `com.karigo.partner`
- App name: KariGO Partner
- Scheme: `karigo-partner`
- Profile: `partner-production`
- Artifact: Android AAB
- VersionCode: `2`
- Target API: `36`

Command:

```powershell
cd apps/partner-app
npx eas-cli build --platform android --profile partner-production --non-interactive
```

## Captain App

Expected:

- Package: `com.karigo.rider`
- App name: KariGO Captain
- Scheme: `karigo-rider`
- Profile: `captain-production`
- Artifact: Android AAB
- VersionCode: `7`
- Target API: `36`

Command:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Upload Verification

For each uploaded AAB, record:

- EAS build ID.
- VersionCode accepted by Play.
- Target API accepted by Play.
- Signing key accepted by Play.
- Internal testing release status.
- Tester availability status.

Do not record direct artifact URLs in Git.
