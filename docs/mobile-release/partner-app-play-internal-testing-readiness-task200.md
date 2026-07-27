# KariGO Partner App Play Internal Testing Readiness - Task 200

Date: 2026-07-27

## Summary

Task 200 upgrades the KariGO Partner App from a mostly read-only companion app into a stronger mobile readiness build for real partners. The app now supports in-app partner onboarding, password recovery, vendor-scoped document uploads, product image uploads, and business logo/cover uploads.

## App Identity

- App name: KariGO Partner
- Android package: `com.karigo.partner`
- Scheme: `karigo-partner`
- Production API base: `https://karigo-8htn.onrender.com/api/v1`
- Production profile: `partner-production`
- Android artifact expected for Play: AAB

## Native Dependency Impact

This task adds native Expo modules:

- `expo-image-picker`
- `expo-document-picker`

Because native modules were added, an Expo OTA/EAS Update alone is not enough for testers who do not already have these modules in the installed binary.

Fresh Partner APK/AAB required: yes.

## Included Mobile Flows

- Partner login remains available for approved Vendor-role accounts.
- Forgot password supports OTP reset for eligible active partner accounts.
- Approved partners can request a fresh activation link if they have not completed password setup.
- New partners can start onboarding in-app instead of being sent only to the web Partner Workspace.
- Product Sellers, Service Providers, and mixed partners can submit application details.
- Approved logged-in partners can upload onboarding documents from the app.
- Product image upload is available from add/edit product forms.
- Business logo and cover image upload is available from profile edit.

## Guardrails

- Uploads remain vendor-scoped and authenticated.
- The app does not expose secrets, keys, OTPs, keystores or build artifacts.
- Application approval is not automatic.
- Marketplace visibility, payouts and service dispatch remain controlled by KariGO review.
- This task does not activate live payouts, provider dispatch, live rides, pharmacy, or payment automation.

## Release Notes For Internal Testing

Before uploading to Google Play Internal Testing:

1. Confirm backend deployment includes the partner password reset compatibility change.
2. Build a fresh Partner AAB with the `partner-production` profile.
3. Confirm package remains `com.karigo.partner`.
4. Confirm no artifact URL, keystore or credential is committed.
5. Upload the AAB only to the approved internal testing track.

Production publishing is not approved by this task.
