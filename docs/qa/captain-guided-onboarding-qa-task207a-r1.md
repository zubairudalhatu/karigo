# Task 207A-R1 — Captain Guided Onboarding QA Checklist

## Purpose

Verify the KariGO Captain guided onboarding flow after backend deployment, Prisma migration and storage configuration.

This checklist does not approve production publishing.

## Backend Checks

- `GET /api/v1/platform/vehicle-catalog` returns vehicle makes, dependent models, years and colours.
- `GET /api/v1/platform/captain-service-areas` returns active Kano and Abuja areas.
- Authenticated applicant upload accepts valid JPG/PNG/WEBP/PDF files.
- Upload response returns document metadata only, not object keys.
- Invalid file type is rejected with a safe message.
- Oversized files are rejected with a safe message.
- Delivery Captain application fails without profile photo document ID.
- Ride Captain application fails without the required Ride document IDs.
- Invalid make/model pair is rejected.
- Expired driver licence date is rejected.
- Unsupported residential or operating area is rejected.

## Captain App Checks

- Existing Customer can sign in without duplicate account creation.
- `403` operational access response does not clear session.
- Application screen shows Residential State/Territory selector.
- Residential City selector depends on selected State/Territory.
- Preferred operating areas support Kano and Abuja multi-select.
- Primary operating area must be selected from preferred areas.
- Vehicle make selector appears.
- Vehicle model selector changes when make changes.
- Vehicle year selector appears.
- Vehicle colour selector appears.
- Licence expiry opens native date picker.
- Profile photo upload works from gallery/camera.
- Ride Captain required uploads work from gallery/camera/file picker as appropriate.
- Submitted application sends document IDs, not document URLs.
- Ride readiness screen links to the guided Captain application instead of showing old HTTPS-link fields.

## Admin Portal Checks

- Delivery Captain Applications show residential location.
- Delivery Captain Applications show preferred operating areas and primary area.
- Delivery Captain Applications show secure uploaded documents.
- Admin can open a short-lived Delivery Captain document view URL.
- Ride Applications show residential location.
- Ride Applications show preferred operating areas and primary area.
- Ride Applications show secure uploaded documents.
- Admin can open a short-lived Ride Captain document view URL.
- Admin pages do not expose storage object keys or long-lived private URLs.

## Fresh AAB Checks

- Package remains `com.karigo.rider`.
- App name remains `KariGO Captain`.
- App version is `0.1.1`.
- Android versionCode is `10`.
- Runtime policy remains `appVersion`.
- Production profile remains `captain-production`.
- Do not publish OTA to runtime `0.1.0`.
- Do not upload to production track.

## Acceptance Status

Task 207A-R1 implementation can be considered code-complete only after local validation passes. Real-device acceptance remains pending until the fresh versionCode `10` Captain build is installed and the full onboarding flow is tested with configured backend storage.
