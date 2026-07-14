# Task 124 Customer App Fresh APK Release Candidate Verification

Date prepared: 2026-07-14

## Purpose

This record documents the fresh Customer App Android APK release-candidate
verification after Task 123 pilot polish.

Task 123 added:

- Ride and KariGO Rides wording cleanup.
- Duplicate submit protection for parcel requests.
- Improved parcel request fields.
- Customer profile photo support.
- Expanded SME Services categories.
- Backend profile photo field and Prisma migration.
- Fresh APK requirement because `expo-image-picker` is a native dependency.

This record is for release verification and controlled pilot readiness only. It
does not activate live Paystack, live Monnify, live Squad, Accelerate.ng
utilities, wallet withdrawals, automatic refunds, live rides, ride dispatch,
payouts, Pharmacy marketplace, provider login, marketing SMS, promotional email,
newsletter email or bulk SMS/email.

## Current Pilot Configuration

| Area | Pilot state | Verification status |
| --- | --- | --- |
| Customer App fresh APK | Tested OK | Passed by initial pilot-owner testing |
| Payment mode | Mock payment | Must remain selected for first Kano pilot |
| Paystack | Sandbox foundation only | Not live |
| Monnify | Sandbox foundation only | Not live |
| Squad | Sandbox foundation only | Not live |
| Accelerate.ng utilities | Future integration | Not active |
| Termii/Resend | Controlled transactional notifications only | Working under approved flags |
| KariGO Rides | Coming soon/readiness-only | No live ride dispatch |
| Wallet withdrawal/refund automation | Disabled | Guardrail remains active |
| Payout automation | Disabled | Guardrail remains active |

## APK Identity

| Item | Expected value | Result | Evidence reference |
| --- | --- | --- | --- |
| App surface | KariGO Customer Staging | Pass | `[EAS/APK evidence outside Git]` |
| Android package | `com.karigo.customer.staging` | Pass | `[Device install evidence outside Git]` |
| EAS profile | `customer-staging` | Pass | `[EAS build evidence outside Git]` |
| EAS branch/channel | `customer-staging` | Pass | `[EAS build evidence outside Git]` |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` | Pass | `[Masked app settings/log evidence]` |
| Source commit | `918b2f5` or later | Pass | `[Git/EAS build reference]` |
| Native dependency included | `expo-image-picker` | Pass | `[APK install/profile photo test]` |
| Build ID / URL | `[Record outside Git]` | Pending evidence reference | Do not paste private APK URLs if restricted |

## Evidence Safety Rules

- Do not commit APK, AAB or build artifacts.
- Do not record passwords, OTP values, delivery codes, access tokens, refresh
  tokens or session values.
- Do not record full phone numbers, private customer addresses or unmasked
  screenshots.
- Do not commit provider dashboard screenshots or API credentials.
- Store APK links, hashes, device screenshots and detailed tester information in
  an approved secure location outside Git.
- Use masked evidence references only in this repository.

## Installation Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `APK124-001` | Install fresh Customer APK on approved Android device | APK installs without replacing production app | Installed during initial test | Pass | Use approved pilot device only |
| `APK124-002` | Launch app after install | App opens without crash | Initial test opened successfully | Pass |  |
| `APK124-003` | Confirm staging API connection | App uses Render staging API | Initial staging flow worked | Pass | API base path remains `/api/v1` |
| `APK124-004` | Login or register pilot test user | Auth flow works without exposing OTP in evidence | Initial tests passed | Pass | Do not record OTP values |
| `APK124-005` | App remains usable after close/reopen | Session and safe guest state behave correctly | To be rechecked during pilot onboarding | Conditional pass |  |

## Task 123 Feature Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `CUST124-001` | Customer home wording | Public wording uses Ride/KariGO Rides, not Taxi | Initial tests passed | Pass | KariGO Rides remains readiness-only |
| `CUST124-002` | Ride readiness tap | User sees coming-soon/readiness copy; no live ride request starts | Initial tests passed | Pass | No ride dispatch activation |
| `CUST124-003` | Parcel form fields | Recipient, item category, package size, declared value, fragile handling and notes are available | Initial tests passed | Pass | Use test data only |
| `CUST124-004` | Parcel duplicate submit protection | Rapid repeat submit does not create duplicate parcel requests | Initial tests passed | Pass | Retest with masked order references during pilot |
| `CUST124-005` | Profile photo selection | User can select a profile photo from device picker | Initial tests passed | Pass | Do not store private screenshots in Git |
| `CUST124-006` | Profile photo save/display | Saved profile photo appears in profile header | Initial tests passed | Pass | Backend profile field must be deployed |
| `CUST124-007` | Profile photo removal | User can remove profile photo safely if supported | Initial tests passed | Pass |  |
| `CUST124-008` | SME Services expanded categories | New categories appear in SME Services request flow | Initial tests passed | Pass | Health professional remains readiness-only |
| `CUST124-009` | Core food order flow | Browse vendor, cart, checkout, mock payment and order detail still work | Initial tests passed | Pass | Mock payment only |
| `CUST124-010` | Support/profile/wallet/referral surfaces | Existing safe placeholder/foundation flows still load | Initial tests passed | Pass | No live wallet/referral reward activation |

## Core Customer Flow Smoke Test

| Flow | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Guest homepage | Guest can browse safe surfaces and see login/sign-up actions | Pass | Preserve protected-action prompts |
| Vendor/product browsing | Kano pilot vendor/products load from staging API | Pass |  |
| Cart and checkout | Server-authoritative quote is required before order creation | Pass | No zero-fee missing quote fallback |
| Mock payment | Payment completes through mock provider only | Pass | Live providers disabled |
| Order details | Order totals and delivery status display correctly | Pass | Delivery code remains protected |
| SME Services request | Request flow remains review-only | Pass | No live provider dispatch |
| Bills/utilities | Readiness/test-mode only | Pass | Accelerate.ng not active |
| KariGO Rides | Readiness-only | Pass | No ride booking or dispatch |

## Release Guardrails Before Distribution

| Guardrail | Required state | Status |
| --- | --- | --- |
| Pilot access list approved | Only approved Kano pilot customers receive APK access | Required before distribution |
| APK source verified | APK must be built from Task 123 commit `918b2f5` or later | Required before distribution |
| Backend deployed | Backend must include Task 123 profile photo field and migration | Required before profile-photo pilot test |
| Mock payment confirmed | `PAYMENTS_PROVIDER=mock` or equivalent pilot mock mode remains selected | Required before distribution |
| Live payment providers | Paystack, Monnify and Squad live mode remain disabled | Required before distribution |
| APK link handling | APK link shared only through approved private channel | Required before distribution |
| Evidence handling | Screenshots and device data are stored outside Git with masking | Required before distribution |
| Support channel ready | Pilot support contact and escalation owner are assigned | Required before distribution |

## Remaining Controlled Pilot Checks

These checks should be repeated with the exact APK and approved pilot accounts before
the APK link is sent to the wider Kano pilot group.

| Check | Owner | Result | Notes |
| --- | --- | --- | --- |
| Fresh APK hash/build ID recorded outside Git | `[Owner]` | `Pass / Pending` |  |
| Android device model/version recorded outside Git | `[Owner]` | `Pass / Pending` |  |
| Customer registration with Termii OTP | `[Owner]` | `Pass / Pending` | Do not record OTP values |
| Account activation email receipt | `[Owner]` | `Pass / Pending` | Mask email address |
| Existing customer login | `[Owner]` | `Pass / Pending` | Use secure credential handover |
| End-to-end mock order | `[Owner]` | `Pass / Pending` | Use masked order reference |
| Parcel duplicate submit retest | `[Owner]` | `Pass / Pending` | Confirm single request only |
| Profile photo retest | `[Owner]` | `Pass / Pending` | Do not commit screenshots |
| SME Services readiness-only health category | `[Owner]` | `Pass / Pending` | Confirm no medical booking activation |

## Issues Found

| Issue ID | Severity | Description | Owner | Status | Blocks pilot distribution |
| --- | --- | --- | --- | --- | --- |
| `APK124-001` |  |  |  | `Open / Resolved / Deferred` | `Yes / No` |
| `APK124-002` |  |  |  |  |  |

## Pilot Readiness Decision

| Decision item | Record |
| --- | --- |
| Customer App fresh APK verification status | Pass |
| Initial pilot-owner testing result | Tested OK |
| Recommended decision | Go for controlled Kano pilot customer distribution |
| Conditions | Use approved private distribution channel; keep mock payment selected; confirm backend Task 123 migration is deployed; do not distribute outside approved pilot list |
| Public release readiness | Not approved by this record |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Technical lead |  | `Approved / Not approved` |  |  |
| Operations lead |  | `Approved / Not approved` |  |  |
| Support lead |  | `Approved / Not approved` |  |  |
| Management reviewer |  | `Approved / Not approved` |  |  |
