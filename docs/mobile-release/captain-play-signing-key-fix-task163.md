# Task 163 - Captain Play Signing Key Fix Record

Date: 18 July 2026

Purpose: record the KariGO Captain Android signing-key mismatch investigation and the safe recovery path for Google Play internal testing.

Production publishing status: not approved.

## Google Play Error

```text
Your Android App Bundle is signed with the wrong key.
Package: com.karigo.rider
```

## Build References

| Build | EAS build ID | Package | Version code | Play result |
| --- | --- | --- | --- | --- |
| Accepted previous Captain AAB | `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` | `com.karigo.rider` | `2` | Accepted by Google Play/internal testing |
| Rejected Captain AAB | `968eae26-7b1e-41da-942c-a27bcd39a01f` | `com.karigo.rider` | `3` | Rejected because signing certificate did not match Play expectation |

Direct artifact URLs are intentionally not recorded in Git.

## Local Configuration Review

Confirmed:

- EAS project ID remains `344a78dc-69d9-4daa-9616-f100b67f0910`.
- App slug remains `karigo-rider`.
- Production package remains `com.karigo.rider`.
- Production profile remains `captain-production`.
- Production channel remains `captain-production`.
- Current production Android versionCode remains `3`.
- Package name was not changed.

## Credential Investigation

EAS credentials were inspected for:

```text
Project: @zamkah/karigo-rider
Application identifier: com.karigo.rider
Build profile: captain-production
```

Only one remote Android build credential was available for the package in the EAS credentials menu. No alternate Play-accepted remote keystore was available to select.

Because the latest AAB signed with the current available EAS credential was rejected by Google Play, a new build using the same current credential would likely be rejected again.

## Current Status

```text
Signing credential corrected: No
New Captain AAB generated in this task: No
Reason: Play-accepted upload key is not available in current EAS remote credentials.
```

## Required Recovery Path

Choose one approved recovery path.

### Option A - Restore the Play-Accepted Upload Key to EAS

Use this if the original upload keystore/private key used by the accepted build can be recovered from approved private storage.

1. Locate the Play-accepted upload keystore in approved private credential storage.
2. Do not commit the keystore or credentials.
3. In `apps/rider-app`, run EAS credentials management.
4. Select `captain-production`.
5. Upload or restore the original upload keystore for `com.karigo.rider`.
6. Confirm the restored upload certificate matches the Google Play Console expected upload certificate.
7. Rebuild the Captain AAB with:

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

### Option B - Reset Google Play Upload Key

Use this if the original upload keystore is unavailable.

1. In Google Play Console, open KariGO Captain.
2. Start the official upload-key reset process.
3. Provide the certificate requested by Play for the new approved upload key.
4. Wait for Google Play to approve the upload-key reset.
5. Keep the private keystore only in approved credential storage or EAS managed credentials.
6. Rebuild the Captain AAB after Play confirms the new upload key.

Do not attempt production rollout during this recovery.

## Version Code Note

Current code uses Captain Android versionCode `3`. Because build `968eae26-7b1e-41da-942c-a27bcd39a01f` was rejected and not accepted, Google Play may still accept versionCode `3` after the signing key is corrected. If Play later rejects versionCode `3` as already used, increment Captain production versionCode to `4` and rebuild.

## Guardrails

- Do not change package `com.karigo.rider`.
- Do not create a new Play app.
- Do not create a new Expo project.
- Do not commit keystore files.
- Do not commit `credentials.json`.
- Do not commit AAB/APK artifacts.
- Do not commit direct artifact URLs.
- Do not publish to production.
