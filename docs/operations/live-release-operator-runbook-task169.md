# Task 169 - Live Release Operator Runbook

Date: 18 July 2026

This runbook coordinates the Task 168 deployment rollout and Task 169 Android internal-testing AAB upload. It does not approve production publishing.

## Source

| Item | Value |
| --- | --- |
| Task 168 commit | `7b3c754 feat: add live onboarding otp recovery and location readiness` |
| Task 169 Customer build ID | `3b6780cb-696e-4bdf-9b4a-d6035ae88a8c` |
| Task 169 Captain build ID | `07683e2e-5f5e-4c16-8f7e-66b746cfbfb5` |
| Customer package | `com.karigo.customer` |
| Captain package | `com.karigo.rider` |
| Customer versionCode | `3` |
| Captain versionCode | `4` |

## Deployment Order

1. Confirm backend Render deployment is on Task 168 commit or newer.
2. Confirm backend health at `/api/v1/health`.
3. Confirm Website deployment is on Task 168 commit or newer.
4. Confirm Admin Portal deployment is on Task 168 commit or newer.
5. Confirm Vendor Dashboard deployment is on Task 168 commit or newer.
6. Upload Customer AAB to Google Play internal testing.
7. Upload Captain AAB to Google Play internal testing.
8. Invite only approved internal testers.
9. Run Kano and Abuja smoke checklist from `docs/launch/live-internal-testing-smoke-signoff-task169.md`.

## EAS Build Artifact Handling

- Retrieve AAB artifacts from Expo dashboard using build IDs.
- Do not commit direct artifact URLs.
- Do not commit downloaded `.aab`, `.apk` or keystore files.
- Do not submit to production.
- Keep Google Play track as internal testing unless separate production approval is recorded.

## EAS Update Note

Task 168 requires Customer and Captain EAS Updates for compatible installed builds, but Task 169 fresh AABs are the required distribution path because mobile native/runtime changes are present:

- Customer release-candidate versionCode `3`
- Captain release-candidate versionCode `4`
- Captain includes native location permissions through `expo-location`

If the operator publishes EAS Updates, use the established production branches/channels:

Customer:

```powershell
cd apps/customer-app
npx eas-cli update --branch customer-production --message "Task 169 live onboarding and location readiness"
```

Captain:

```powershell
cd apps/rider-app
npx eas-cli update --branch captain-production --message "Task 169 captain location and live onboarding readiness"
```

Do not use EAS Update as a substitute for the fresh Captain AAB.

## Google Play Internal Testing Upload

Customer:

1. Open Google Play Console.
2. Select the KariGO customer app.
3. Open Internal testing.
4. Create or edit a release.
5. Upload the AAB from build ID `3b6780cb-696e-4bdf-9b4a-d6035ae88a8c`.
6. Confirm package `com.karigo.customer`.
7. Confirm versionCode `3`.
8. Add internal-testing release notes.
9. Save and roll out to internal testing only.

Captain:

1. Open Google Play Console.
2. Select the KariGO Captain app.
3. Open Internal testing.
4. Create or edit a release.
5. Upload the AAB from build ID `07683e2e-5f5e-4c16-8f7e-66b746cfbfb5`.
6. Confirm package `com.karigo.rider`.
7. Confirm versionCode `4`.
8. Confirm no signing-key mismatch.
9. Add internal-testing release notes.
10. Save and roll out to internal testing only.

## Stop Conditions

Stop rollout if any of these occur:

- Backend health fails.
- Customer or Captain AAB upload is rejected.
- Captain signing-key mismatch appears.
- VersionCode is rejected as already used.
- Squad checkout does not open externally.
- OTP verification or OTP recovery fails for live test accounts.
- Vendor activation link expires immediately or exposes raw token in UI.
- Captain GPS updates while offline.
- Any P0/P1 issue is discovered.

## Production Publishing

Production publishing is not approved in Task 169. A separate Go/No-Go record and release approval are required before any production rollout.
