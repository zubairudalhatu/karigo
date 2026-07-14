# Task 125 KariGO Captain APK Release Candidate Verification

Date prepared: 2026-07-14

## Purpose

This record documents the KariGO Captain Android APK release-candidate
verification before controlled Kano pilot distribution to Delivery Captains.

Task 125 follows Task 124, which recorded the Customer App fresh APK as ready for
controlled Kano pilot customer distribution. This record covers only the KariGO
Captain App release-candidate verification for Delivery Captain pilot use.

This record does not activate live Paystack, live Monnify, live Squad,
Accelerate.ng utilities, wallet withdrawals, automatic refunds, live rides, ride
dispatch, payouts, Pharmacy marketplace, provider login, marketing SMS,
promotional email, newsletter email or bulk SMS/email.

## Current Pilot Status

| Area | Pilot state | Verification status |
| --- | --- | --- |
| Customer App APK | Go for controlled pilot | Covered by Task 124 |
| KariGO Captain APK | Needs release-candidate verification | Pending execution in this record |
| Delivery Captain mode | Pilot-ready | Must be verified on fresh APK |
| Ride Captain mode | Readiness-only | Must remain non-live |
| Live rides | Disabled | Guardrail must remain active |
| Ride dispatch | Disabled | Guardrail must remain active |
| Payout automation | Disabled | Guardrail must remain active |
| Mock payment | Default | No live payment dependency |

## APK Identity

| Item | Expected value | Result | Evidence reference |
| --- | --- | --- | --- |
| App surface | KariGO Captain Staging | `Pass / Fail / Blocked` | `[EAS/APK evidence outside Git]` |
| Android package | `com.karigo.rider.staging` | `Pass / Fail / Blocked` | `[Device install evidence outside Git]` |
| EAS profile | `rider-staging` | `Pass / Fail / Blocked` | `[EAS build evidence outside Git]` |
| EAS branch/channel | `rider-staging` | `Pass / Fail / Blocked` | `[EAS build evidence outside Git]` |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` | `Pass / Fail / Blocked` | `[Masked app settings/log evidence]` |
| App name | KariGO Captain | `Pass / Fail / Blocked` | `[Device evidence outside Git]` |
| Build ID / URL | `[Record outside Git]` | Pending evidence reference | Do not paste private APK URLs if restricted |
| Source commit | `[Commit hash]` | Pending evidence reference | Must match approved release candidate |

## Evidence Safety Rules

- Do not commit APK, AAB or build artifacts.
- Do not record passwords, delivery OTP values, access tokens, refresh tokens or
  session values.
- Do not record full phone numbers, private customer addresses, device identifiers
  or unmasked screenshots.
- Do not commit provider dashboard screenshots or API credentials.
- Store APK links, hashes, device screenshots and detailed tester information in
  an approved secure location outside Git.
- Use masked evidence references only in this repository.

## Installation Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `CAP125-001` | Install fresh Captain APK on approved Android device | APK installs without replacing production app |  | `Pass / Fail / Blocked` | Use approved pilot device only |
| `CAP125-002` | Launch app after install | App opens without crash |  | `Pass / Fail / Blocked` |  |
| `CAP125-003` | Confirm app name and branding | App displays KariGO Captain branding |  | `Pass / Fail / Blocked` | No old Rider-only public branding |
| `CAP125-004` | Confirm staging API connection | App uses Render staging API |  | `Pass / Fail / Blocked` | API base path remains `/api/v1` |
| `CAP125-005` | Login with approved Delivery Captain account | Login succeeds using secure handover credentials |  | `Pass / Fail / Blocked` | Do not record password |
| `CAP125-006` | Close and reopen app | Session remains safe or returns to login clearly |  | `Pass / Fail / Blocked` |  |
| `CAP125-007` | Logout | Session clears and login screen returns |  | `Pass / Fail / Blocked` |  |

## Delivery Captain Mode Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `DEL125-001` | Dashboard loads | Captain name, availability, active delivery and summary cards show safely |  | `Pass / Fail / Blocked` |  |
| `DEL125-002` | Availability toggle | Captain can go available/unavailable through staging API |  | `Pass / Fail / Blocked` |  |
| `DEL125-003` | Assigned jobs list | Assigned delivery jobs load or safe empty state appears |  | `Pass / Fail / Blocked` |  |
| `DEL125-004` | Job detail | Pickup, delivery and order references display without sensitive customer data overexposure |  | `Pass / Fail / Blocked` |  |
| `DEL125-005` | Accept job | Accepted job updates through backend and app reloads current state |  | `Pass / Fail / Blocked` |  |
| `DEL125-006` | Reject job | Rejected job is handled safely and remains auditable |  | `Pass / Fail / Blocked` |  |
| `DEL125-007` | Pickup progression | Captain can move through pickup states only in valid order |  | `Pass / Fail / Blocked` |  |
| `DEL125-008` | Delivery progression | Captain can move through on-the-way and arrived states only in valid order |  | `Pass / Fail / Blocked` |  |
| `DEL125-009` | Mark delivered | Order reaches `DELIVERED` before OTP completion |  | `Pass / Fail / Blocked` |  |
| `DEL125-010` | Valid customer delivery code | Customer-supplied code completes delivery |  | `Pass / Fail / Blocked` | Do not record delivery code |
| `DEL125-011` | Invalid customer delivery code | Wrong code is rejected safely and order remains active |  | `Pass / Fail / Blocked` |  |
| `DEL125-012` | Captain cannot view delivery code | App accepts code input but never displays the customer's code |  | `Pass / Fail / Blocked` |  |
| `DEL125-013` | Earnings page | Earnings summary loads without payout or withdrawal activation |  | `Pass / Fail / Blocked` |  |
| `DEL125-014` | Notifications page | Captain notifications render safely |  | `Pass / Fail / Blocked` |  |
| `DEL125-015` | Profile page | Captain profile data loads and logout remains available |  | `Pass / Fail / Blocked` |  |

## Ride Captain Guardrail Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `RIDE125-001` | Ride Captain entry point | Ride Captain is shown only as readiness/onboarding, not live dispatch |  | `Pass / Fail / Blocked` |  |
| `RIDE125-002` | Live ride booking attempt | No live ride booking or ride assignment can be started |  | `Pass / Fail / Blocked` |  |
| `RIDE125-003` | Ride dispatch guardrail | App does not expose ride dispatch queues or live ride jobs |  | `Pass / Fail / Blocked` |  |
| `RIDE125-004` | Wording | App uses Ride Captain/KariGO Rides wording, not old Taxi wording |  | `Pass / Fail / Blocked` |  |

## UI And Safety Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `UI125-001` | Header polish | No route names, internal paths or awkward duplicate titles are visible |  | `Pass / Fail / Blocked` |  |
| `UI125-002` | Bottom navigation | Home, Deliveries, Earnings and Profile route correctly |  | `Pass / Fail / Blocked` |  |
| `UI125-003` | Password visibility | Captain can show/hide password while typing |  | `Pass / Fail / Blocked` | Do not record password |
| `UI125-004` | Error states | Network/API failures show safe messages, not raw JSON or stack traces |  | `Pass / Fail / Blocked` |  |
| `UI125-005` | Render cold start | Loading and retry states remain understandable |  | `Pass / Fail / Blocked` |  |
| `UI125-006` | Staging guardrail copy | App states live payouts, withdrawals and live rides remain disabled |  | `Pass / Fail / Blocked` |  |

## End-To-End Pilot Chain

Run this chain only with approved staging accounts and masked evidence references.

| Step | Expected result | Status | Evidence reference |
| --- | --- | --- | --- |
| Customer creates mock-paid order | Order becomes paid and visible to vendor/admin | `Pass / Fail / Blocked` |  |
| Vendor accepts/prepares order | Order becomes dispatch-ready | `Pass / Fail / Blocked` |  |
| Admin assigns Delivery Captain | Captain receives assigned job | `Pass / Fail / Blocked` |  |
| Delivery Captain accepts job | Job state updates safely | `Pass / Fail / Blocked` |  |
| Delivery Captain completes pickup/delivery progression | Backend and portals stay in sync | `Pass / Fail / Blocked` |  |
| Customer reveals delivery code | Code shown only to owning customer at eligible stage | `Pass / Fail / Blocked` | Do not record code |
| Delivery Captain submits delivery code | Order becomes completed | `Pass / Fail / Blocked` |  |
| Admin verifies final status | Order, earnings and settlement records are consistent | `Pass / Fail / Blocked` |  |

## Release Guardrails Before Distribution

| Guardrail | Required state | Status |
| --- | --- | --- |
| Pilot Captain access list approved | Only approved Kano Delivery Captains receive APK access | Required before distribution |
| APK source verified | APK must be built from the approved Captain release-candidate commit | Required before distribution |
| Backend deployed | Backend must match current delivery OTP/order workflow | Required before distribution |
| Mock payment confirmed | Customer checkout remains mock payment for first pilot | Required before distribution |
| Live rides disabled | KariGO Rides and Ride Captain remain readiness-only | Required before distribution |
| Payout automation disabled | Earnings visibility does not trigger payout or withdrawal flows | Required before distribution |
| APK link handling | APK link shared only through approved private channel | Required before distribution |
| Evidence handling | Screenshots and device data are stored outside Git with masking | Required before distribution |
| Support channel ready | Captain support and escalation owner are assigned | Required before distribution |

## Issues Found

| Issue ID | Severity | Description | Owner | Status | Blocks Captain distribution |
| --- | --- | --- | --- | --- | --- |
| `CAP125-001` |  |  |  | `Open / Resolved / Deferred` | `Yes / No` |
| `CAP125-002` |  |  |  |  |  |

## Pilot Readiness Decision

| Decision item | Record |
| --- | --- |
| KariGO Captain APK verification status | Pending execution |
| Delivery Captain mode status | Pilot-ready, pending fresh APK verification evidence |
| Recommended decision | Conditional Go after installation, login, delivery E2E and guardrail tests pass |
| Conditions | Use approved private distribution channel; keep live rides disabled; keep payout automation disabled; do not distribute outside approved Captain list |
| Public release readiness | Not approved by this record |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Technical lead |  | `Approved / Not approved` |  |  |
| Operations lead |  | `Approved / Not approved` |  |  |
| Dispatch lead |  | `Approved / Not approved` |  |  |
| Management reviewer |  | `Approved / Not approved` |  |  |
