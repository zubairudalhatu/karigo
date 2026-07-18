# Task 170 Customer and Captain Fresh Build Notes

## Fresh Build Requirement

A fresh Customer and Captain Android AAB build is required after Task 170 because both apps now include the native Expo module:

```text
expo-local-authentication ~16.0.5
```

EAS Update alone is not enough for users who do not already have this native module in the installed binary.

## Customer App Build Notes

- Package remains `com.karigo.customer`.
- App name remains `KariGO`.
- Squad live checkout URLs open externally.
- Wallet top-up verification is available from the wallet screen.
- Password reset, change password, in-app legal pages, account deletion request and biometric sign-in controls are included.

## Captain App Build Notes

- Package remains `com.karigo.rider`.
- App name remains `KariGO Captain`.
- Captain dashboard/profile UI cleanup is included.
- Captain biometric sign-in controls and in-app legal pages are included.
- Offline live-location updates show the approved message.

## Commands After Final Approval

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

## Guardrails

- Do not commit AAB/APK artifacts.
- Do not commit build artifact URLs.
- Do not publish to production from this task.
- Confirm Google Play internal-testing upload before broader rollout.
