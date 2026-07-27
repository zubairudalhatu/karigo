# Task 204 Operations Note: Unified Account Role Conversion and KariGO Rides

Date: 2026-07-27

## Purpose

Task 204 keeps KariGO on a central account model while allowing the same customer account to continue into Partner and Captain onboarding.

The implementation does not convert the database to a multi-role array. Instead, it keeps the existing `User.role` as a legacy/base account marker and derives operational access from linked records:

- Customer access: central `User` plus customer profile/session.
- Partner access: linked Partner/Vendor application or approved Partner profile.
- Captain access: linked Delivery Captain or Ride Captain readiness application/profile.

This preserves existing data and avoids risky role/database migration during launch preparation.

## Account Conversion Rules

- Existing customer accounts can sign into Partner App and KariGO Captain App with the same phone/password.
- Partner App checks Partner onboarding/profile state after login.
- Captain App checks Delivery Captain and Ride Captain readiness/application state after login.
- Applicant creation should not create another `User` when the phone already belongs to an active customer account.
- Phone numbers are normalized before auth/application matching so local Nigerian and international formats map to the same canonical account.
- Duplicate active Partner/Captain applications remain blocked.

## Partner App States

Partner App should show one of these safe states:

- `application_not_started`
- `application_in_progress`
- `application_submitted`
- `correction_required`
- `approved`
- `rejected`
- `restricted`

The app should not show a generic “account cannot use Partner app” message for a normal existing customer account.

## Captain App States

KariGO Captain App should allow the same existing account to reach a useful dashboard state:

- Delivery Captain application/status when present.
- Ride Captain readiness application/status when present.
- Clear onboarding prompt when a Captain application is not yet started.

Ride Captain remains readiness/manual review only.

## KariGO Rides Booking Flow

The Customer App Rides flow is now structured as:

1. Rides home
2. Pickup and destination selection
3. Saved/recent/manual places
4. Current-location pickup helper
5. Route preview summary
6. Backend fare estimate
7. Ride category selection
8. Payment/schedule/pickup instruction review
9. Controlled-pilot request creation
10. Tracking/status screen

The Customer App hides normal marketplace bottom navigation during ride booking so the booking flow feels focused.

## Safety Guardrails

- No live ride dispatch was activated.
- No automatic matching was activated.
- No ride payment capture was activated.
- No Captain payout automation was activated.
- Ride requests remain manual Operations/Admin assignment.
- Backend remains final authority for fare estimate and trip creation.

## Deployment Notes

- Backend redeploy is required for account-state endpoint changes, Partner route authorization compatibility, phone normalization, and Rides category/fare estimate support.
- Customer EAS Update is required for the Rides booking UI and bottom-navigation behavior.
- Partner EAS Update is required for existing-customer Partner login/onboarding state handling.
- Captain EAS Update is required for existing-customer Captain dashboard/onboarding state handling.
- Prisma migration is not required.
- Fresh AABs are required only if the current Play/Internal Testing binaries do not apply OTA updates reliably.

## Task 205 Deployment Record

Recorded: 2026-07-27

Task 205 deployed and verified the Task 204 release path in this order: backend first, then Customer, Captain, and Partner Android production-channel EAS updates.

### Backend Deployment

- Task 204 implementation commit: `90dd47d feat: support unified account role onboarding`.
- Deployment trigger commit: `2980296 chore: trigger task 204 backend deploy`.
- Backend compatibility correction commit: `73c21e6 fix: add backend render compatibility entrypoint`.
- Deployed backend URL: `https://karigo-8htn.onrender.com/api/v1`.
- Health check result: `GET /health` returned `200`.
- Task 204 route existence checks:
  - `GET /customer/taxi/ride-categories` returned `401` without auth, confirming the protected Rides category route is live.
  - `GET /vendor-applications/me` returned `401` without auth, confirming the protected Partner application state route is live.

Render initially served a healthy but stale backend route table after the Task 204 deploy trigger. The correction added a safe compatibility entrypoint at `services/backend-api/dist/main.js` that requires the real compiled Nest entrypoint at `services/backend-api/dist/services/backend-api/src/main.js`. This keeps existing Render start commands working while preserving the preferred `npm run start:prod` path.

### Mobile OTA Updates

| App | Channel | Branch | Runtime | Platform | Update ID | Group ID | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `customer-production` | `0.1.0` | Android | `019fa496-334d-7ead-bed6-c54256311472` | `6da17148-d659-40c6-a238-57734d4e503c` | Published |
| KariGO Captain App | `captain-production` | `captain-production` | `0.1.0` | Android | `019fa497-9b34-72e9-9323-f7144a66064c` | `449f5bea-8e1c-49c1-acd7-521443de79d8` | Published |
| KariGO Partner App | `partner-production` | `partner-production` | `0.1.0` | Android | `019fa499-1c6d-74d0-84f4-7724410ddc35` | `c7b90519-2520-44f1-b1c5-0cc59cf6438c` | Published |

All three updates were published with message: `Task 204 unified account onboarding and rides flow`.

### Device Verification Requirement

Task 205 cannot be fully signed off until a controlled Android device verifies that the installed Customer, Captain, and Partner apps receive the updates and complete the account-conversion/Rides scenarios. If any installed app remains on stale bundled code or reports runtime incompatibility, build a fresh AAB using the confirmed production profiles:

- Customer: `customer-production`
- Captain: `captain-production`
- Partner: `partner-production`

Do not use obsolete Rider profile names for Captain production builds.

## Task 205B Acceptance Operations Record

Recorded: 2026-07-27

Task 205B is the physical Android device acceptance phase. During this pass, backend readiness and EAS production branch metadata were rechecked, but no physical Android device was available through workstation tooling and no owner/tester observations were supplied. Real-device acceptance is therefore still open.

### Environment Readiness

- Backend health remained available: `GET /health` returned `200`.
- Protected Task 204 routes remained registered:
  - `GET /customer/taxi/ride-categories` returned `401` without auth.
  - `GET /vendor-applications/me` returned `401` without auth.
- Latest Android production OTA branch metadata remained aligned:
  - Customer `customer-production` group: `6da17148-d659-40c6-a238-57734d4e503c`.
  - Captain `captain-production` group: `449f5bea-8e1c-49c1-acd7-521443de79d8`.
  - Partner `partner-production` group: `c7b90519-2520-44f1-b1c5-0cc59cf6438c`.
- Runtime reported by the latest Android OTA metadata for all three apps: `0.1.0`.
- `adb` was not available on the workstation, so installed app versions, update receipt, and in-app behavior could not be inspected directly.

### Operational Acceptance Gate

The following must still be completed on installed Android apps before final Task 205B signoff:

1. Confirm installed app versions/version codes and runtime compatibility for Customer, Captain, and Partner.
2. Confirm each app receives the expected production OTA update.
3. Confirm an existing Customer account retains Customer access.
4. Confirm the same account can start or resume Partner onboarding without the old generic role rejection.
5. Confirm the same account can start or resume Captain onboarding without login loops.
6. Confirm local and international Nigerian phone formats resolve to one central account.
7. Confirm no duplicate Customer account, Partner application, or Captain application is created.
8. Confirm KariGO Rides pickup, destination, route preview, categories, fare estimate, and controlled-pilot request creation on-device.
9. Confirm safe-area and Android navigation behavior across smaller/taller devices and gesture/three-button navigation.

### Fresh AAB Decision

No fresh AAB was generated in Task 205B. Continue with OTA unless real-device testing shows stale bundles, runtime mismatch, wrong production channel, or update receipt failure. If a fresh build is required, use:

- Customer: `customer-production`
- Captain: `captain-production`
- Partner: `partner-production`

## Task 205C Fresh Production AAB Build Record

Recorded: 2026-07-27

Real-device screenshots and observations showed that the installed binaries stayed on old bundled code and did not apply the Task 204 OTA updates. The build path moved from OTA-only to fresh production Android AABs for Customer, Captain, and Partner.

### Version Changes

| App | Version Name | Previous Version Code | New Version Code | Package |
| --- | --- | --- | --- | --- |
| Customer App | `0.1.0` | `10` | `11` | `com.karigo.customer` |
| KariGO Captain App | `0.1.0` | `7` | `8` | `com.karigo.rider` |
| KariGO Partner App | `0.1.0` | `2` | `3` | `com.karigo.partner` |

The Captain production profile used was `captain-production`; `rider-production` was not used.

### Build Results

| App | Profile | Channel | Runtime | Build ID | EAS Build Page | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `customer-production` | `0.1.0` | `88246831-24a5-451d-9ba1-95e3d60c6ad0` | `https://expo.dev/accounts/zamkah/projects/karigo-customer/builds/88246831-24a5-451d-9ba1-95e3d60c6ad0` | Finished |
| KariGO Captain App | `captain-production` | `captain-production` | `0.1.0` | `157b005f-8a2b-41f8-b6fe-3000cfd081f6` | `https://expo.dev/accounts/zamkah/projects/karigo-rider/builds/157b005f-8a2b-41f8-b6fe-3000cfd081f6` | Finished |
| KariGO Partner App | `partner-production` | `partner-production` | `0.1.0` | `ced51023-5d89-4bc9-9f61-7008bb4ba280` | `https://expo.dev/accounts/zamkah/projects/karigo-partner/builds/ced51023-5d89-4bc9-9f61-7008bb4ba280` | Finished |

All builds used source commit `9646db004a694f10fcedb9fc66e25cefeac37933`.

Direct AAB artifact URLs, signed log URLs, keystores, credentials, and downloaded artifacts were not committed. Artifact checksums were not computed because the AAB files were not downloaded to the workspace.

### Distribution Procedure

AAB files cannot normally be installed directly on Android devices. Use one approved route:

1. Google Play internal testing.
2. Google Play internal app sharing.
3. Another approved bundle-to-device procedure.

After installation, record the device model, Android version, installed version code, navigation mode, and whether the old binary was replaced.

### Acceptance Status

Fresh AAB build phase is complete. Real-device installation and acceptance remain pending for:

- Customer App Task 204 Rides interface.
- Partner existing-customer onboarding.
- Captain existing-customer onboarding.
- Phone-normalisation and duplicate prevention.
- KariGO Rides pickup/destination/category/fare/request flow.
- Android safe-area and navigation-mode checks.

## Task 205D Operations Update

Recorded: 2026-07-27

Task 205D moves the post-Task-205C fixes into a release-candidate build path:

- Customer App: versionCode `12`, required because native map support was added for KariGO Rides.
- KariGO Captain App: versionCode `9`, required because Google Play reported versionCode `8` had already been used.
- KariGO Partner App: versionCode remains `3`; current changes are JavaScript-only and should be delivered by production EAS Update unless later device testing proves a fresh AAB is needed.

### Customer Rides Operations Notes

- The Customer App now uses a native-backed map provider and Expo Location for pickup/destination convenience.
- Android builds must have a Google Maps API key configured in EAS or the build environment through `GOOGLE_MAPS_ANDROID_API_KEY` or `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`.
- The app does not commit any Google Maps key or location-provider secret.
- The Rides flow remains a controlled-pilot workflow. Backend fare estimate and trip creation remain the authority.
- Live ride dispatch, automated matching, ride payment capture, ride payouts and auto-assignment remain disabled.
- No backend location proxy was added in this task. A backend Places/Directions proxy can be added later if KariGO wants server-side provider control, quota protection, or route-polylines from a paid Maps provider.

### Partner App Operations Notes

- Existing Customer credentials can enter Partner onboarding without the old generic role rejection.
- The registration start screen validates visible prefilled full name, phone and email values, then hydrates Partner registration state before moving to account type.
- Partner workspace navigation is now hidden until the account state is approved.
- Partner profile editing is blocked until the Partner profile is active/approved.
- Bottom navigation now respects Android bottom safe-area spacing.

### Build and Distribution Plan

| App | Required Action | Reason |
| --- | --- | --- |
| Customer App | Fresh production AAB built: `1952bd4e-bec1-45a2-95d2-57191333dba8` | Native map dependency requires a new binary. |
| KariGO Captain App | Fresh production AAB built: `33734820-a737-417f-803a-542564f2c350` | Play upload retry needs versionCode `9`. |
| KariGO Partner App | Production OTA published: `019fa54d-0cfe-7dba-8499-060a383ee959` | Fix is JavaScript-only; fresh AAB is optional if OTA does not apply. |

Partner OTA group ID: `87e3cd47-8155-4666-b7ea-643e1418cf11`.

Customer build caveat: the Customer AAB build completed successfully, but the EAS build output reported no production Google Maps API key environment variable. Operations must confirm `GOOGLE_MAPS_ANDROID_API_KEY` or `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` is configured before relying on Android map rendering. If the installed build shows a blank map, configure the key through EAS/approved secret manager and rebuild the Customer AAB.

### Post-Upload Acceptance

After uploading the new AABs to Google Play internal testing and publishing the Partner update:

1. Install the Customer App internal-testing build and confirm versionCode `12`.
2. Install the KariGO Captain internal-testing build and confirm versionCode `9`.
3. Force-close/reopen the Partner App and confirm the latest Partner production update applies.
4. Verify Customer Rides current-location, search, map-pin, route-preview, category fare range and controlled request creation.
5. Verify Partner existing-customer onboarding and pre-approval navigation gating.
6. Verify approved Partner profile workspace tabs still load.
7. Verify Captain login/session and delivery/ride readiness screens still load.
8. Record any issue without passwords, OTPs, screenshots, direct artifact URLs, keystores or private phone numbers.

## Post-Deployment Smoke Checks

1. Login as an existing customer in Customer App.
2. Login with the same account in Partner App.
3. Confirm Partner App shows recognised/onboarding status instead of rejecting the account.
4. Continue Partner onboarding and confirm no duplicate account is created.
5. Login with the same account in KariGO Captain App.
6. Confirm Delivery Captain and/or Ride Captain state appears where applicable.
7. Open Customer App KariGO Rides.
8. Select pickup/destination.
9. Confirm backend fare estimate and ride categories load.
10. Submit a controlled-pilot ride request.
11. Confirm Admin/Operations can see the request for manual assignment.

## Rollback Plan

If post-deployment Partner/Captain access has unexpected behavior:

1. Roll back mobile OTA updates for Partner/Captain first.
2. If backend authorization causes regressions, redeploy the previous backend commit.
3. Verify Customer App auth and existing Vendor Dashboard access.
4. Keep any submitted Partner/Captain applications; do not delete live records as part of rollback.
