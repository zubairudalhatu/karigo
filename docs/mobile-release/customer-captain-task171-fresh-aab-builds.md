# Task 171 Fresh Customer and Captain AAB Builds

Date: 18 July 2026

## Purpose

Task 170 added native biometric support through `expo-local-authentication` plus payment, wallet and security fixes. Fresh Android App Bundles are required before Google Play Internal Testing can reflect the latest Customer and KariGO Captain behaviour.

## Build Inputs

Customer App:
- EAS profile: `customer-production`
- Package: `com.karigo.customer`
- Android artifact type: AAB
- Previous production versionCode: `3`
- New production versionCode: `4`
- API base URL: `https://karigo-8htn.onrender.com/api/v1`

KariGO Captain App:
- EAS profile: `captain-production`
- Package: `com.karigo.rider`
- Android artifact type: AAB
- Previous production versionCode: `4`
- New production versionCode: `5`
- API base URL: `https://karigo-8htn.onrender.com/api/v1`

## Build Results

Customer App:
- Build command: `cd apps/customer-app && npx eas-cli build --platform android --profile customer-production --non-interactive`
- EAS build ID: `7607b400-412c-49be-b321-a8677ddb98cc`
- Build status: Completed
- Artifact type: AAB

KariGO Captain App:
- Build command: `cd apps/rider-app && npx eas-cli build --platform android --profile captain-production --non-interactive`
- EAS build ID: `e4e3d2e1-dcca-4135-9638-d571d4989f23`
- Build status: Completed
- Artifact type: AAB

Do not commit AAB files, keystores, credentials, screenshots or direct artifact URLs. Use the EAS dashboard to access artifacts for Google Play Internal Testing.

## Validation Summary

- Customer Expo production config: passed, package `com.karigo.customer`, versionCode `4`
- Captain Expo production config: passed, package `com.karigo.rider`, versionCode `5`
- Customer typecheck: passed
- Customer regression check: passed
- Captain typecheck: passed
- Captain regression check: passed
- EAS Customer AAB build: completed
- EAS Captain AAB build: completed

## Deployment Impact

- Backend redeploy required: No, unless Task 170 has not already been deployed
- Website redeploy required: No, unless Task 170 has not already been deployed
- Admin Portal redeploy required: No
- Vendor Dashboard redeploy required: No
- Prisma migration required: No
- Customer fresh AAB required: Yes, completed in this task
- Captain fresh AAB required: Yes, completed in this task
- Production publishing performed: No
