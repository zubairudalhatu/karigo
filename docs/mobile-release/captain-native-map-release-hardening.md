# KariGO Captain Native Map Release Hardening

Date: 2026-08-02

## Scope

This note records the release guardrails for the Captain native-map build line after adding `react-native-maps` to `apps/rider-app`.

## Native Runtime

- App: KariGO Captain
- Package: `com.karigo.rider`
- EAS slug: `karigo-rider`
- EAS profile: `captain-production`
- EAS channel: `captain-production`
- App version: `0.1.2`
- Runtime policy: `appVersion`
- Resolved runtime: `0.1.2`
- Android versionCode: `11`
- Production API base: `https://karigo-8htn.onrender.com/api/v1`

Do not publish the native-map JavaScript bundle to runtime `0.1.1`. The existing `0.1.1` Captain binary does not include the native map module.

## Google Maps Android Key Gate

The Captain production build must read one of these environment variables:

- `GOOGLE_MAPS_ANDROID_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`

Do not commit or print the key.

Before building, the project owner must confirm the configured Android Maps key is authorised for:

- Android package: `com.karigo.rider`
- SHA-1 fingerprint from the Captain production signing certificate
- Maps SDK for Android

A key restricted only to `com.karigo.customer` is not sufficient for the Captain app.

## Build Gate

Proceed to the Captain Android AAB build only after:

- Expo config resolves version `0.1.2`
- Expo config resolves runtime `0.1.2`
- Expo config resolves Android versionCode `11` or higher
- Android manifest contains the Google Maps API metadata
- Google Maps key restrictions above are confirmed in Google Cloud Console

No OTA publish or AAB build was performed as part of this release-hardening step.
