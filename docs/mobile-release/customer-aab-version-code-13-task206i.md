# Customer Production AAB VersionCode 13 - Task 206I

## Purpose

Build a fresh Customer production Android App Bundle after Task 206H utility form fixes because the installed Play Internal Testing app did not reliably apply the OTA update.

## Build Scope

- App: KariGO Customer
- Package: `com.karigo.customer`
- Version name: `0.1.0`
- Android versionCode: `13`
- EAS project: `@zamkah/karigo-customer`
- EAS profile: `customer-production`
- EAS channel: `customer-production`
- Runtime version: `0.1.0`
- Backend API base: `https://karigo-8htn.onrender.com/api/v1`
- Source commit expected to include Task 206H: `217e4d7d85cf35ac6fe336290c5dc39719b59895`

## Google Maps Configuration

The Customer Android build reads the Maps SDK key from the EAS production environment variable:

- `GOOGLE_MAPS_ANDROID_API_KEY`

Do not commit the key, paste it into docs, or expose it in build logs. The app config passes the key into Android `config.googleMaps.apiKey` during build when the variable is present.

## Google Cloud Restriction Checklist

Before relying on maps in Google Play Internal Testing, confirm the Google Cloud API key restriction is configured for:

- API restriction: Maps SDK for Android.
- Application restriction: Android apps.
- Android package name: `com.karigo.customer`.
- Certificate SHA-1: use the Google Play App Signing certificate SHA-1 for this app.

The project owner can find the Play App Signing SHA-1 in Google Play Console:

`Setup -> App integrity -> App signing -> App signing key certificate`

For Play-distributed internal testing, the App signing certificate is the important restriction. If testing a locally sideloaded build outside Play, a separate upload/debug certificate SHA-1 may also be needed, but that should not replace the Play App Signing SHA-1 for Play installs.

## VersionCode Reuse Check

Local docs and EAS Customer production Android build history were checked before the build. No previous Customer production Android build with versionCode `13` was found in EAS history. Google Play Console remains the final authority during upload.

## Build Record

- Build ID: recorded in Task 206I completion report.
- Build status: recorded in Task 206I completion report.
- Direct artifact URL: do not commit.

## Real-Device Acceptance

Building the AAB does not complete real-device acceptance. After Google Play Internal Testing installation, verify maps, utility provider selectors, review flow, safe Accelerate unavailable state, and eligible cancellation behavior on device.
