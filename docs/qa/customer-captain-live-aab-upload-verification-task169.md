# Task 169 - Customer and Captain AAB Upload Verification

Date: 18 July 2026

Purpose: verify that the fresh Customer and KariGO Captain Android App Bundles can be uploaded to Google Play internal testing without publishing to production.

## Build Artifacts To Upload

| App | Package | Build ID | VersionCode | Artifact |
| --- | --- | --- | ---: | --- |
| Customer App | `com.karigo.customer` | `3b6780cb-696e-4bdf-9b4a-d6035ae88a8c` | `3` | AAB from Expo dashboard |
| KariGO Captain App | `com.karigo.rider` | `07683e2e-5f5e-4c16-8f7e-66b746cfbfb5` | `4` | AAB from Expo dashboard |

Do not paste or commit artifact URLs. Do not upload APK files for the production store track.

## Customer Upload Checklist

| Check | Expected result | Status | Evidence location |
| --- | --- | --- | --- |
| Download artifact from Expo | AAB downloaded from build ID `3b6780cb-696e-4bdf-9b4a-d6035ae88a8c` | Pending | Outside Git |
| Upload to Google Play internal testing | Upload accepted | Pending | Play Console |
| Package name | `com.karigo.customer` | Pending | Play Console |
| Version code | `3` accepted and not reused | Pending | Play Console |
| Track | Internal testing only | Pending | Play Console |
| Production release | Not created | Pending | Play Console |

Suggested Customer internal-testing release notes:

```text
Live Kano and Abuja onboarding refresh, Squad checkout readiness, Pay on Delivery visibility, wallet top-up readiness, GPS/manual address support, OTP recovery, Privacy & Security, and account-first vendor/captain onboarding links.
```

## Captain Upload Checklist

| Check | Expected result | Status | Evidence location |
| --- | --- | --- | --- |
| Download artifact from Expo | AAB downloaded from build ID `07683e2e-5f5e-4c16-8f7e-66b746cfbfb5` | Pending | Outside Git |
| Upload to Google Play internal testing | Upload accepted | Pending | Play Console |
| Package name | `com.karigo.rider` | Pending | Play Console |
| Version code | `4` accepted and not reused | Pending | Play Console |
| Signing key | Accepted by Google Play | Pending | Play Console |
| Track | Internal testing only | Pending | Play Console |
| Production release | Not created | Pending | Play Console |

Suggested Captain internal-testing release notes:

```text
KariGO Captain location readiness, online/offline GPS controls, Delivery Captain application documents, Ride Captain review copy, payout copy cleanup, and live Kano/Abuja launch polish.
```

## Signing-Key Safety

If Google Play reports a signing-key mismatch for the Captain app:

1. Stop the upload.
2. Confirm the app package is still `com.karigo.rider`.
3. Confirm the build was created under `@zamkah/karigo-rider`.
4. Compare with the previously accepted Captain signing credential.
5. Rebuild using the original accepted EAS credential.
6. Use the Google Play upload-key reset process only if the original signing credential cannot be recovered.

Do not commit keystore files, credentials, passwords or key fingerprints.
