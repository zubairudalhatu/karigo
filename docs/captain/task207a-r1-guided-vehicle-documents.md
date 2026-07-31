# Task 207A-R1 — Guided Captain Vehicle, Location and Document Onboarding

## Scope

Task 207A-R1 extends the unified Captain onboarding flow from Task 207A without changing package identity or activating unsupported operations.

- App: KariGO Captain
- Android package: `com.karigo.rider`
- App version: `0.1.1`
- Production Android versionCode: `10`
- Runtime policy: `appVersion`, so runtime becomes `0.1.1`
- Delivery Captain: application/onboarding only until Admin approval
- Ride Captain: readiness/review only unless separately approved for controlled operations

Do not publish this work as an OTA update to the previous `0.1.0` runtime/versionCode `9` build. A fresh Captain AAB is required after backend storage configuration and validation.

## Customer-To-Captain Continuity

The Task 207A unified account behavior remains in place:

- Existing KariGO Customer accounts can sign in to KariGO Captain and continue onboarding.
- The Captain app does not create duplicate accounts when the phone number already belongs to a Customer.
- Ordinary `403` responses do not destroy the saved session.
- Applicant intent is preserved across sign-in using the existing Captain application intent store.

## Guided Location Selection

The Captain application now uses controlled location data instead of free text for launch-state eligibility.

Active operating areas:

- Kano State / Kano
- Federal Capital Territory / Abuja

Captured fields:

- `residentialStateCode`
- `residentialCityCode`
- `operatingAreaIds`
- `primaryOperatingAreaId`

Residential state/city is a single dependent selection. Preferred operating areas support multi-select, and one selected area must be marked as primary.

## Guided Vehicle Catalog

The backend exposes a public platform catalog for Captain app selectors:

- `GET /api/v1/platform/vehicle-catalog`
- `GET /api/v1/platform/captain-service-areas`

The vehicle catalog contains:

- supported vehicle makes
- dependent model options
- supported vehicle years
- supported vehicle colours
- Delivery/Ride vehicle types

The backend remains the final validator for make/model/year/colour combinations. `Other` is supported only when the matching custom field is provided.

## Secure Document Uploads

The Captain app now uploads files instead of asking applicants to paste hosted URLs.

Applicant endpoint:

- `POST /api/v1/captain/application-documents/uploads`
- `DELETE /api/v1/captain/application-documents/:documentId`

Admin view endpoints:

- `GET /api/v1/admin/delivery-captain-applications/:applicationId/documents/:documentId/view`
- `GET /api/v1/admin/taxi/driver-applications/:applicationId/documents/:documentId/view`

Admin endpoints return short-lived signed view URLs only. Stored object keys are not returned to public or customer-facing responses.

Supported upload MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

Current file size limit:

- 10 MB request limit
- 8 MB image/document validation limit in service logic

Required uploads:

- Delivery Captain: profile photo
- Ride Captain readiness: profile photo, driver licence image, vehicle exterior photo, vehicle interior photo, vehicle licence/particulars

Optional uploads:

- insurance
- roadworthiness
- guarantor ID

## Storage Environment

Backend storage uses environment variables only. Do not commit storage credentials.

Required when `CAPTAIN_UPLOADS_STORAGE_ENABLED=true`:

- `CAPTAIN_UPLOADS_STORAGE_REGION`
- `CAPTAIN_UPLOADS_STORAGE_BUCKET`
- `CAPTAIN_UPLOADS_STORAGE_ACCESS_KEY_ID`
- `CAPTAIN_UPLOADS_STORAGE_SECRET_ACCESS_KEY`

Optional:

- `CAPTAIN_UPLOADS_STORAGE_ENDPOINT`
- `CAPTAIN_UPLOADS_STORAGE_FORCE_PATH_STYLE`

If `CAPTAIN_UPLOADS_STORAGE_ENDPOINT` is set, it must be HTTPS.

## Migration

The migration adds:

- `CaptainApplicationDocumentType`
- `CaptainDocumentUploadStatus`
- secure `CaptainApplicationDocument` records
- residential and operating-area fields on Delivery Captain and Ride Captain applications
- custom vehicle fields on Ride Captain applications

Run Prisma migrate deploy during backend deployment.

## Fresh AAB Gate

Do not build or distribute the final Captain AAB until all are true:

- backend migration is applied
- backend storage env vars are configured in Render/approved secret manager
- backend build/typecheck/tests pass
- Admin Portal can view short-lived secure document links
- Captain Expo Doctor passes

The next Play Internal Testing AAB must be built from app version `0.1.1`, versionCode `10`.

## Production Runtime Module Hotfix

Follow-up Task 207A-R1-H1 fixed a Render startup failure from commit `0c3ffcf`.

Root cause:

- Task 207A-R1 introduced backend runtime imports from `@karigo/shared-types`.
- `@karigo/shared-types` is currently source-oriented for web/mobile workspaces, with `main` and `types` pointing at `src/index.ts`.
- The backend compiled successfully, but production Node resolved `@karigo/shared-types` to TypeScript workspace source and failed during `npm run start:prod`.

Selected architecture:

- Backend Captain catalogue runtime values now live in a backend-local compiled module: `services/backend-api/src/modules/platform/captain-catalog.ts`.
- Mobile apps can continue using `@karigo/shared-types` for source/bundler-friendly fallback catalogue data.
- Backend imports from `@karigo/shared-types` are type-only only; runtime catalogue imports resolve to compiled backend JavaScript.

Build pipeline change:

- Backend `npm run build` now removes stale `dist` output before `nest build`.
- `services/backend-api/scripts/verify-render-build.cjs` recursively checks emitted JavaScript for production-unsafe references:
  - `.ts` runtime require/import targets
  - `packages/*/src`
  - source-only KariGO workspace package runtime imports
- The verifier smoke-loads compiled Captain catalogue, platform catalogue service and validation modules with plain Node.js.

Render guidance:

- Existing Render Start Command remains `npm run start:prod`.
- `start:prod` remains `node dist/services/backend-api/src/main.js`.
- No Render Shell step is required.
- The existing Task 207A-R1 Prisma migration was already applied; this hotfix adds no new migration.

Deployment recovery checks:

1. Deploy the hotfix commit.
2. Confirm pre-deploy reports no pending migrations.
3. Confirm `npm run start:prod` starts Nest successfully.
4. Confirm the service binds to Render port `10000`.
5. Confirm `/api/v1/health` succeeds.
6. Confirm `/api/v1/platform/vehicle-catalog` succeeds.
7. Confirm `/api/v1/platform/captain-service-areas` returns Kano and Abuja.
8. Confirm there are no `MODULE_NOT_FOUND`, `.ts` source import or workspace source runtime errors.

## Task 207A-R2 Follow-Up

Task 207A-R2 builds on this secure-upload foundation.

It adds:

- a permanent Captain `/application-status` screen;
- locked editable application forms after submission;
- correct approved/provisionally-approved/activation-pending copy;
- Admin document review controls for secure uploads;
- approval blocking until required documents are approved;
- `LOGIN READY` projection for existing KariGO accounts with password credentials;
- separate Delivery/Ride application, document and operational profile lifecycle handling.

See `docs/captain/task207a-r2-post-submission-review-state.md` for the detailed review and activation workflow.
