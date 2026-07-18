# Task 171 Google Play Internal Testing Upload Checklist

Date: 18 July 2026

## Objective

Upload the fresh Task 171 Android App Bundles to Google Play Internal Testing only. Do not publish to production.

## Build References

Customer App:
- Package: `com.karigo.customer`
- VersionCode: `4`
- EAS build ID: `7607b400-412c-49be-b321-a8677ddb98cc`
- Artifact type: AAB

KariGO Captain App:
- Package: `com.karigo.rider`
- VersionCode: `5`
- EAS build ID: `e4e3d2e1-dcca-4135-9638-d571d4989f23`
- Artifact type: AAB

Do not paste direct EAS artifact URLs into Git-tracked files. Retrieve each AAB from the EAS dashboard during the Play Console upload step.

## Upload Steps

Customer App:
- [ ] Open Google Play Console for `com.karigo.customer`.
- [ ] Go to Internal testing.
- [ ] Create a new release.
- [ ] Upload the Customer AAB for EAS build ID `7607b400-412c-49be-b321-a8677ddb98cc`.
- [ ] Confirm versionCode `4`.
- [ ] Add internal release notes: `Task 171 fresh Customer build with biometric, wallet and payment security updates.`
- [ ] Save and review.
- [ ] Roll out to internal testing only.

KariGO Captain App:
- [ ] Open Google Play Console for `com.karigo.rider`.
- [ ] Go to Internal testing.
- [ ] Create a new release.
- [ ] Upload the Captain AAB for EAS build ID `e4e3d2e1-dcca-4135-9638-d571d4989f23`.
- [ ] Confirm versionCode `5`.
- [ ] Add internal release notes: `Task 171 fresh Captain build with biometric, session and location smoke-test readiness.`
- [ ] Save and review.
- [ ] Roll out to internal testing only.

## Post-Upload Checks

- [ ] Google Play accepts both AABs.
- [ ] No signing-key mismatch appears.
- [ ] No reused versionCode error appears.
- [ ] Internal testers can see update/install availability.
- [ ] Installed Customer build shows Task 170 payment/security behaviour.
- [ ] Installed Captain build shows Task 170 biometric/location/UI behaviour.
- [ ] Live smoke test record is completed in `docs/qa/live-mobile-smoke-test-task171.md`.

## Guardrails

- Production publishing performed: No
- Live payment behaviour remains controlled by backend environment and public payment config.
- Do not commit AAB/APK files, screenshots, keystores, credentials or direct artifact URLs.
