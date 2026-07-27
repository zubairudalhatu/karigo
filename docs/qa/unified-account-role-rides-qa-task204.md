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
