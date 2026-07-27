# Task 204 QA Checklist: Unified Accounts and KariGO Rides Upgrade

Date: 2026-07-27

## Scope

This checklist verifies that one KariGO customer account can continue into Partner and Captain onboarding without creating duplicate accounts, and that the Customer App KariGO Rides flow now behaves like a staged booking experience instead of the old pilot-only form.

Do not record passwords, OTPs, payment card data, tokens, screenshots, or private phone numbers in this file.

## Preconditions

- Backend is redeployed with Task 204 changes.
- Customer App, Partner App, and KariGO Captain App receive the Task 204 update or fresh builds as required by release channel behavior.
- Rides remain controlled-pilot/manual-operations only.
- Live ride dispatch, automated matching, ride payments, payouts, and public ride launch remain disabled unless separately approved.

## Task 205 Deployment Verification

Recorded: 2026-07-27

Task 205 deployed the Task 204 backend/mobile update set and recorded the production-channel deployment evidence. This section records only non-sensitive deployment metadata and does not include passwords, OTPs, tokens, private phone numbers, screenshots, or Expo artifact URLs.

### Backend

| Check | Result | Notes |
| --- | --- | --- |
| Task 204 commit present on main | Passed | `90dd47d feat: support unified account role onboarding` is in the deployed commit history. |
| Backend deploy commit | Passed | Latest pushed deployment commit: `73c21e698b49f9410becf0e2e43d09f00be6ae5a`. |
| Backend health | Passed | `GET https://karigo-8htn.onrender.com/api/v1/health` returned `200`. |
| Rides category route registered | Passed | `GET /api/v1/customer/taxi/ride-categories` returned `401` without auth, confirming the protected Task 204 route is live instead of missing. |
| Partner application state route registered | Passed | `GET /api/v1/vendor-applications/me` returned `401` without auth, confirming the protected Task 204 route is live instead of missing. |
| Deployment correction | Passed | Render compatibility entrypoint was fixed so old `node dist/main` style start commands load the real compiled backend entrypoint. |

### Mobile Production Updates

| App | Channel | Branch | Runtime | Platform | Update ID | Group ID | Commit | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `customer-production` | `0.1.0` | Android | `019fa496-334d-7ead-bed6-c54256311472` | `6da17148-d659-40c6-a238-57734d4e503c` | `73c21e698b49f9410becf0e2e43d09f00be6ae5a` | Published |
| KariGO Captain App | `captain-production` | `captain-production` | `0.1.0` | Android | `019fa497-9b34-72e9-9323-f7144a66064c` | `449f5bea-8e1c-49c1-acd7-521443de79d8` | `73c21e698b49f9410becf0e2e43d09f00be6ae5a` | Published |
| KariGO Partner App | `partner-production` | `partner-production` | `0.1.0` | Android | `019fa499-1c6d-74d0-84f4-7724410ddc35` | `c7b90519-2520-44f1-b1c5-0cc59cf6438c` | `73c21e698b49f9410becf0e2e43d09f00be6ae5a` | Published |

### Device QA Status

| Area | Result | Notes |
| --- | --- | --- |
| Installed Customer App receives update | Pending real-device verification | Force-close/reopen and confirm Task 204 Rides/onboarding UI appears. |
| Installed KariGO Captain App receives update | Pending real-device verification | Confirm Captain app no longer loops or blocks existing customer credentials generically. |
| Installed KariGO Partner App receives update | Pending real-device verification | Confirm Partner app allows an existing customer account to continue onboarding. |
| Existing customer retains Customer access | Pending real-device verification | Use a controlled QA account only; do not record credentials here. |
| Same account starts/resumes Partner onboarding | Pending real-device verification | Confirm no duplicate central user or Partner application is created. |
| Same account starts/resumes Captain onboarding | Pending real-device verification | Confirm no duplicate central user or Captain application is created. |
| Local and international Nigerian phone formats match one account | Pending credentialed verification | Test local `0...` and international `+234...` formats without recording the private number. |
| KariGO Rides booking flow works on device | Pending real-device verification | Verify pickup, destination, categories, fare estimate, and controlled-pilot ride request creation. |
| Safe-area/device-size checks | Pending real-device verification | Test smaller/taller Android screens and gesture/three-button navigation where available. |

### Fresh AAB Decision

No fresh AAB was generated during Task 205. OTA production updates were published first as required. Fresh AABs should be built only if the installed apps fail to receive these updates, report runtime incompatibility, or controlled distribution requires a new binary.

## Task 205B Real-Device Acceptance Log

Recorded: 2026-07-27

Task 205B is the real-device acceptance phase for the deployed Task 204 update set. No real-device observations, screenshots, device models, Android versions, or app-version confirmations were supplied during this documentation pass, and no Android Debug Bridge tooling was available on the workstation. Therefore the real-device scenarios remain pending until the installed apps are checked on physical Android devices.

### Pre-Test Environment Checks

| Check | Result | Notes |
| --- | --- | --- |
| Backend health | Passed | `GET https://karigo-8htn.onrender.com/api/v1/health` returned `200`. |
| Rides route protected/live | Passed | `GET /api/v1/customer/taxi/ride-categories` returned `401` without auth, confirming the protected route remains registered. |
| Partner application route protected/live | Passed | `GET /api/v1/vendor-applications/me` returned `401` without auth, confirming the protected route remains registered. |
| Customer production branch latest Android group | Passed | `customer-production` latest Android update group is `6da17148-d659-40c6-a238-57734d4e503c`. |
| Captain production branch latest Android group | Passed | `captain-production` latest Android update group is `449f5bea-8e1c-49c1-acd7-521443de79d8`. |
| Partner production branch latest Android group | Passed | `partner-production` latest Android update group is `c7b90519-2520-44f1-b1c5-0cc59cf6438c`. |
| Runtime version alignment | Passed for published OTA metadata | All three latest Android production updates report runtime `0.1.0`. Installed binary runtime must still be checked on-device. |
| Workstation Android device access | Not available | `adb` was not installed or available in `PATH`, so installed apps could not be inspected from this workstation. |

### Real-Device Acceptance Status

| Scenario | Status | Evidence Needed |
| --- | --- | --- |
| Customer App receives and runs production OTA update | Pending real-device verification | Device model, Android version, installed app version/versionCode, and visible Task 204 UI confirmation. |
| Captain App receives and runs production OTA update | Pending real-device verification | Device model, Android version, installed app version/versionCode, and Captain onboarding continuation evidence. |
| Partner App receives and runs production OTA update | Pending real-device verification | Device model, Android version, installed app version/versionCode, and Partner onboarding continuation evidence. |
| Existing Customer login remains functional | Pending real-device verification | Controlled QA account result with private details redacted. |
| Existing Customer starts/resumes Captain onboarding | Pending real-device verification | Confirmation that login does not loop and no duplicate Captain application is created. |
| Existing Customer starts/resumes Partner onboarding | Pending real-device verification | Confirmation that the old generic Partner role rejection does not appear and no duplicate Partner application is created. |
| Local/international Nigerian phone formats resolve to one account | Pending credentialed/device verification | Redacted confirmation from Customer, Captain, Partner, OTP/password lookup, and application retrieval flows. |
| KariGO Rides home and booking flow | Pending real-device verification | Pickup, destination, route preview, categories, fare estimate, and controlled-pilot request creation evidence. |
| Safe-area and Android navigation behavior | Pending real-device verification | Smaller/taller Android screens and gesture/three-button navigation observations. |

### Task 205B Acceptance Status

Task 205B partially completed — environment and OTA branch checks passed, but real-device acceptance remains pending for Customer App, Captain App, Partner App, phone-normalisation, unified-account onboarding, KariGO Rides booking, and safe-area/device testing.

## Task 205C Fresh AAB Build Verification

Recorded: 2026-07-27

Owner-reported real-device evidence showed that the installed Android binaries did not apply the Task 204 OTA updates. The Customer App still showed the old `Request KariGO Ride` form, duplicate back controls, large pilot information card, unlabelled numeric fields, and marketplace bottom navigation during ride booking. The Partner App still showed the old generic role rejection for an existing Customer account. A fresh production AAB build was therefore required for Customer, Captain, and Partner.

No passwords, OTPs, tokens, private account details, screenshots, direct AAB artifact URLs, keystores, or credentials were committed.

### Build Profiles and Configuration

| App | Profile | Package | Version | Version Code | Runtime | Channel | API Base | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `com.karigo.customer` | `0.1.0` | `11` | `0.1.0` | `customer-production` | `https://karigo-8htn.onrender.com/api/v1` | Config validated |
| KariGO Captain App | `captain-production` | `com.karigo.rider` | `0.1.0` | `8` | `0.1.0` | `captain-production` | `https://karigo-8htn.onrender.com/api/v1` | Config validated |
| KariGO Partner App | `partner-production` | `com.karigo.partner` | `0.1.0` | `3` | `0.1.0` | `partner-production` | `https://karigo-8htn.onrender.com/api/v1` | Config validated |

### EAS Build Results

| App | Build ID | Build Page | Status | Artifact Type | Source Commit |
| --- | --- | --- | --- | --- | --- |
| Customer App | `88246831-24a5-451d-9ba1-95e3d60c6ad0` | `https://expo.dev/accounts/zamkah/projects/karigo-customer/builds/88246831-24a5-451d-9ba1-95e3d60c6ad0` | Finished | Android AAB | `9646db004a694f10fcedb9fc66e25cefeac37933` |
| KariGO Captain App | `157b005f-8a2b-41f8-b6fe-3000cfd081f6` | `https://expo.dev/accounts/zamkah/projects/karigo-rider/builds/157b005f-8a2b-41f8-b6fe-3000cfd081f6` | Finished | Android AAB | `9646db004a694f10fcedb9fc66e25cefeac37933` |
| KariGO Partner App | `ced51023-5d89-4bc9-9f61-7008bb4ba280` | `https://expo.dev/accounts/zamkah/projects/karigo-partner/builds/ced51023-5d89-4bc9-9f61-7008bb4ba280` | Finished | Android AAB | `9646db004a694f10fcedb9fc66e25cefeac37933` |

Direct AAB artifact URLs and build log signed URLs were not recorded in this repository. Artifact checksums were not computed because the AAB files were not downloaded into the workspace.

### Validation

| Check | Result |
| --- | --- |
| Backend Prisma validate | Passed |
| Backend typecheck | Passed |
| Backend build | Passed |
| Backend full test suite | Passed: 65 suites, 516 tests |
| Customer typecheck | Passed |
| Customer regression check | Passed |
| Customer Expo config validation | Passed |
| Captain typecheck | Passed |
| Captain regression check | Passed |
| Captain Expo config validation | Passed |
| Partner typecheck | Passed |
| Partner regression check | Passed |
| Partner Expo config validation | Passed |
| Secret/artifact scan on changed files | Passed before build-doc commit |
| Git diff check | Passed before build-doc commit |

### Installation and Acceptance Status

| Area | Status | Notes |
| --- | --- | --- |
| Customer AAB distribution/install | Pending | Upload the AAB to Google Play internal testing, internal app sharing, or another approved AAB distribution flow. |
| Captain AAB distribution/install | Pending | Upload the AAB to Google Play internal testing, internal app sharing, or another approved AAB distribution flow. |
| Partner AAB distribution/install | Pending | Upload the AAB to Google Play internal testing, internal app sharing, or another approved AAB distribution flow. |
| Customer Rides Task 204 interface appears | Pending real-device verification | Confirm the old ride form, duplicate back controls, numeric fields, and marketplace nav issue are gone. |
| Partner unified onboarding works | Pending real-device verification | Confirm the old generic role rejection no longer appears. |
| Captain unified onboarding works | Pending real-device verification | Confirm login does not loop and the first incomplete onboarding step opens. |
| Phone normalisation | Pending real-device/admin verification | Confirm equivalent Nigerian phone formats resolve to one central account and one application per role. |
| Safe-area checks | Pending real-device verification | Test Android gesture/three-button navigation and small/tall screens. |

### Task 205C Acceptance Status

Task 205C build phase completed — real-device installation and acceptance pending.

## Task 205D Implementation and Build Verification

Recorded: 2026-07-27

Task 205D addresses the next real-device findings after the Task 205C AABs:

- Captain Google Play internal-testing upload rejected the previous Captain AAB because versionCode `8` had already been used.
- Partner App now accepts existing Customer credentials, but `Continue Partner onboarding` was disabled even when visible prefilled account data was valid.
- Partner App profile and navigation could expose approved-workspace actions before the application/profile state was approved.
- Partner App bottom navigation could sit too close to Android gesture/three-button navigation.
- Customer App KariGO Rides needed native-backed map/location UX instead of the older form-heavy staged flow.

### Task 205D Code Verification

| Area | Expected Result | Status | Notes |
| --- | --- | --- | --- |
| Customer Rides native map provider | Rides request flow uses native-backed map preview, markers, route line, map picking, current location, geocoding and reverse geocoding | Implemented | Uses Expo Location and `react-native-maps`; no backend map secret was added. |
| Customer Rides copy/layout | Booking uses compact Rides copy, no duplicate native header, no normal marketplace bottom nav during booking | Implemented | Route remains controlled-pilot/manual operations only. |
| Customer Rides fare formatting | Category cards show compact fare ranges such as `NGN 1,900-2,160` in-app with naira symbol formatting | Implemented | Backend remains fare authority. |
| Customer map API key handling | Android Maps SDK key is read from EAS/build env only | Implemented | Expected env names: `GOOGLE_MAPS_ANDROID_API_KEY` or `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`. No key is committed. |
| Customer versionCode | Customer production versionCode is bumped for map-native AAB | Implemented | New Customer versionCode: `12`. |
| Partner registration continuation | Existing Customer account values are hydrated into registration state and validated from visible fields | Implemented | Fixes disabled Continue button for prefilled valid data. |
| Partner workspace gating | Bottom navigation and profile edit actions appear only after approved Partner state | Implemented | Pre-approved users stay in safe onboarding/status screens. |
| Partner safe area | Bottom nav respects device bottom safe area | Implemented | Adds extra scroll bottom padding to reduce overlap. |
| Captain versionCode | Captain production versionCode is bumped for Play upload retry | Implemented | New Captain versionCode: `9`. |

### Task 205D Build Records

| App | Profile | Package | Version Code | Build ID | Artifact Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Customer App | `customer-production` | `com.karigo.customer` | `12` | Pending | Android AAB | Pending EAS build |
| KariGO Captain App | `captain-production` | `com.karigo.rider` | `9` | Pending | Android AAB | Pending EAS build |
| KariGO Partner App | `partner-production` | `com.karigo.partner` | `3` | Pending OTA update ID | OTA update | Pending EAS Update |

Direct AAB artifact URLs, signed build log URLs, screenshots, keystores, credentials, OTPs, tokens, and private account details must not be recorded in this file.

### Task 205D Validation Status

| Check | Result |
| --- | --- |
| Customer typecheck | Passed |
| Customer regression check | Passed |
| Customer Expo config validation | Passed: package `com.karigo.customer`, versionCode `12` |
| Captain typecheck | Passed |
| Captain regression check | Passed |
| Captain Expo config validation | Passed: package `com.karigo.rider`, versionCode `9` |
| Partner typecheck | Passed |
| Partner regression check | Passed |
| Partner Expo config validation | Passed: package `com.karigo.partner`, versionCode `3` |
| Prisma validate | Passed |
| Prisma generate | Passed |
| Backend typecheck | Passed |
| Backend build | Passed |
| Backend full test suite | Passed: 65 suites, 516 tests |
| Expo Doctor | Passed for Customer, Captain and Partner |
| Secret/artifact scan | Passed on changed Task 205D files |
| Git diff check | Passed |

### Task 205D Real-Device Acceptance Status

Implementation and build preparation are complete. Final real-device acceptance remains pending until the new Customer and Captain AABs are uploaded to Google Play internal testing, installed by testers, and the Partner production update is confirmed on-device.

Required real-device checks:

1. Customer Rides opens the compact map-based flow and does not show the old form-heavy ride page.
2. Customer Rides can use current location, saved places, typed search suggestions, and map pin selection.
3. Customer Rides shows markers, a route line, category fare ranges, safe Cash-only ride payment copy, and manual Operations assignment copy.
4. Existing Customer credentials can continue Partner onboarding with the `Continue Partner onboarding` button enabled when visible data is valid.
5. Partner bottom navigation is hidden before approval and no longer overlaps Android bottom navigation.
6. Partner approved profile can still use the normal workspace tabs.
7. Captain AAB versionCode `9` uploads successfully to Google Play internal testing.
8. No live ride dispatch, ride payments, payouts, or auto-approval are activated.

## Unified Account QA

Use one existing active customer account. Record only a masked reference such as `customer account A`.

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Customer can still log into Customer App | Login succeeds; customer flows still load | Pending | |
| Same phone/password logs into Partner App | Login succeeds; app recognises the account | Pending | |
| Partner App does not show generic role rejection | App shows recognised account, continue onboarding, under review, correction required, approved, rejected, or restricted state | Pending | |
| Partner onboarding from existing Customer uses same account | Vendor/Partner application links to the central user; no duplicate user is created | Pending | |
| Re-submitting active Partner application is blocked idempotently | User sees existing application state instead of duplicate application | Pending | |
| Same phone/password logs into KariGO Captain App | Login succeeds; dashboard loads an onboarding/status state | Pending | |
| Captain App shows Delivery Captain state if present | Delivery Captain application/status card appears | Pending | |
| Captain App shows Ride Captain readiness state if present | Ride Captain application/status card appears | Pending | |
| Local phone format and international format resolve to same account | `080...` and `+234...` variants resolve to the same central account | Pending | |

## Partner State QA

| Account State | Expected Partner App Copy/State | Result | Notes |
| --- | --- | --- | --- |
| Active customer, no Partner application | Recognised account; continue Partner onboarding | Pending | |
| Submitted application | Application under review / submitted state | Pending | |
| Changes requested | Correction required with safe note | Pending | |
| Approved Partner profile | Partner dashboard loads | Pending | |
| Rejected application | Clear not-approved state; no dashboard access | Pending | |
| Suspended/closed/restricted account | Restricted/support state | Pending | |

## KariGO Rides Booking QA

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Customer opens KariGO Rides | Rides home screen appears; no old duplicate back controls | Pending | |
| Bottom marketplace navigation is hidden during booking | No Customer bottom nav while inside `/taxi/request` booking flow | Pending | |
| Pickup can use current location | App requests location permission and fills a pickup label when allowed | Pending | |
| Pickup can use saved address | Saved address appears and can populate pickup | Pending | |
| Destination can use saved/recent/manual place | Destination populates without requiring numeric distance fields | Pending | |
| Route preview appears | Pickup/destination summary and estimate prompt appear | Pending | |
| Fare estimate comes from backend | App calls backend fare estimate; no customer-entered distance/duration fields are required | Pending | |
| Ride categories appear | Economy, Comfort, Executive, and XL display when backend returns categories | Pending | |
| Category selection updates estimate | Selected category is sent to backend and shown in estimate | Pending | |
| Payment and schedule options are safe | Cash/manual pilot option is available; wallet/card ride payment remains disabled | Pending | |
| Booking creates a controlled-pilot Ride request | Backend creates request with trip reference and PIN; no automatic dispatch | Pending | |
| Tracking screen appears after booking | Customer sees request status, PIN, and manual Operations assignment note | Pending | |
| Cancel from tracking is safe | Cancel action updates the request or shows a safe failure message | Pending | |

## Admin/Operations Verification

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Admin can see new Ride request | Request appears in Rides/Taxi operations area | Pending | |
| Ride request includes selected category | Admin/record metadata includes selected ride category | Pending | |
| Ride request remains manual assignment only | No automatic dispatch or live ride payment is triggered | Pending | |
| Captain visibility remains assignment-based | Captain cannot self-claim unassigned rides | Pending | |

## Regression Guardrails

- Customer App parcel, food/grocery, wallet, utilities, and SME Services should still load.
- Partner App approved profiles should still load dashboard/orders/products/services/profile.
- KariGO Captain Delivery Captain flows should still load assigned delivery jobs.
- Backend auth, vendor applications, phone normalization, and ride fare tests should pass.

## Known Limits

- Route preview is a staged in-app summary, not a live map route engine.
- Ride categories and fare estimates are backend-driven but still controlled-pilot only.
- Ride Captain assignment remains manual through Operations/Admin.
- No live ride payments, live ride dispatch, payouts, or automatic matching were activated.
