# Task 150 - Android Closed Testing QA Checklist

Date: 2026-07-17

## Purpose

Provide the QA checklist and evidence template for KariGO Android internal or closed testing.

This checklist applies after the Customer App and KariGO Captain App AAB artifacts are uploaded to Google Play internal or closed testing tracks.

## Tester Setup

- [ ] Tester is part of the approved Play Console tester group.
- [ ] Tester receives the official Play testing link through an approved channel.
- [ ] Tester installs from the Play testing link, not from an APK sideload.
- [ ] Tester uses a supported Android device.
- [ ] Tester understands that live payments are disabled.
- [ ] Tester does not capture screenshots containing OTPs, private phone numbers, payment references or sensitive account data unless masked.

## Customer App Test Scenarios

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from Play testing link | App installs successfully | Pending |
| Open app | KariGO Customer opens without crash | Pending |
| Register or login | Auth flow works with approved test credentials/OTP path | Pending |
| Add address | Address can be added or selected | Pending |
| Browse categories | Categories and vendor surfaces load | Pending |
| Add product to cart | Cart updates once without duplicate submit issues | Pending |
| Checkout quote | Server quote shows subtotal, delivery fee, discount and payable amount | Pending |
| Mock payment | Mock payment remains available as staging fallback | Pending |
| Monnify Sandbox | Sandbox initialization works or safe error is recorded | Pending |
| Paystack Test Mode | Test-mode initialization works or safe error is recorded | Pending |
| Order history/detail | Created orders appear with correct status and totals | Pending |
| SME Services request | Request can be submitted safely | Pending |
| SME Services tracking | Request appears in history/detail with safe status | Pending |
| Profile/support/legal links | Links and pages open correctly | Pending |
| Logout | User session clears safely | Pending |

## KariGO Captain App Test Scenarios

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from Play testing link | App installs successfully | Pending |
| Open app | KariGO Captain opens without crash | Pending |
| Login | Delivery Captain login works with approved test credentials | Pending |
| Availability toggle | Availability state updates safely | Pending |
| Assigned delivery visibility | Assigned jobs appear when dispatch assigns them | Pending |
| Pickup flow | Captain can progress pickup steps | Pending |
| Delivery OTP flow | Captain can enter customer-provided delivery code | Pending |
| Complete delivery | Completed delivery status syncs across platform | Pending |
| Earnings/settlement display | Earnings/settlement display is safe if available | Pending |
| Support/logout | Support and logout work correctly | Pending |

## Payment Testing Rules

- Live payments remain disabled.
- Monnify and Paystack are sandbox/test only.
- Squad is deferred for launch.
- Mock payment remains the staging fallback.
- No real customer payment should be collected during closed testing unless management explicitly approves a separate controlled live test.
- Any payment failure must be logged with time, device, app, selected provider, expected result and safe screenshot/reference.

## QA Evidence Template

| Field | Value |
| --- | --- |
| Tester name |  |
| Device model |  |
| Android version |  |
| App tested | Customer / Captain |
| Build ID |  |
| Install source | Play internal testing / Play closed testing |
| Test date/time |  |
| Scenario |  |
| Expected result |  |
| Actual result |  |
| Status | Passed / Failed / Blocked |
| Screenshot/video reference |  |
| Issue severity | P0 / P1 / P2 / P3 |
| Issue owner |  |
| Resolution status | Open / In progress / Fixed / Retested / Accepted |

## Closed Testing Exit Criteria

Go if:

- Both apps upload successfully to internal or closed testing.
- Testers can install both apps.
- Login works.
- Customer checkout reaches payment selection.
- Monnify/Paystack sandbox behavior is confirmed.
- Mock payment works for staging fallback.
- Captain core delivery flow works.
- No critical crash exists.
- Backend health remains stable.

No-Go if:

- App cannot be installed.
- Login fails broadly.
- Backend is unavailable.
- Payment flow blocks all checkout paths.
- Customer App crashes during checkout.
- Captain App cannot complete delivery flow.
- Legal/privacy links are missing.
- Package/signing issue blocks upload.

## Current Status

```text
Closed testing QA: Pending upload/testing
Production publishing: Not approved
Live payments: Disabled
```
