# Task 154 - Captain Play Upload Version Code Verification

Date: 2026-07-17

## Purpose

Provide the QA verification checklist for retrying KariGO Captain Google Play internal or closed testing upload after incrementing Android `versionCode` from `1` to `2`.

Do not record private tester data, direct artifact URLs, Play Console screenshots, credentials or APK/AAB files in this document.

## Artifact Reference

| Field | Value |
| --- | --- |
| App | KariGO Captain App |
| Package | `com.karigo.rider` |
| Previous rejected build ID | `79123804-7a58-45ad-807e-d9d87dffea1f` |
| New build ID | `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` |
| Previous versionCode | `1` |
| New versionCode | `2` |
| Profile | `captain-production` |
| Artifact type | Android App Bundle (`.aab`) |
| Build status | Passed |

## Google Play Upload Retry Checklist

| Check | Expected result | Status |
| --- | --- | --- |
| Correct app selected | Google Play app is KariGO Captain | Pending operator evidence |
| Correct package | Play Console shows `com.karigo.rider` | Pending operator evidence |
| Correct track selected | Internal testing or Closed testing only | Pending operator evidence |
| Task 154 AAB selected | Build `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` is uploaded | Pending operator evidence |
| Version code accepted | Google Play accepts `versionCode` `2` | Pending operator evidence |
| Production avoided | No production rollout is created | Pending operator evidence |
| Tester group | Only approved testers are selected | Pending operator evidence |
| Testing link | Stored outside Git | Pending operator evidence |

## Post-Upload Smoke Checklist

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from testing track | Captain app installs from Play testing link | Pending |
| Launch | App opens without crash | Pending |
| Login | Delivery Captain can sign in | Pending |
| Session persistence | Session remains stable after app restart | Pending |
| Availability | Online/offline status displays correctly | Pending |
| Delivery assignment | Assigned order appears after Admin dispatch | Pending |
| Delivery flow | Pickup and delivery stages progress correctly | Pending |
| Delivery code | Customer-provided code completes delivery | Pending |
| Ride mode | Ride Captain remains readiness-only | Pending |
| Live payments/rides | No live payment or live ride flow is enabled | Pending |

## Evidence Rules

- Do not commit direct Expo artifact URLs.
- Do not commit Play testing links.
- Do not commit tester emails, phone numbers, OTPs, passwords or addresses.
- Do not commit screenshots containing sensitive operational data.

## Current Result

```text
Build generated: Yes
Upload retry: Pending operator action
Expected Play blocker resolution: versionCode 2 should satisfy the reused-version-code requirement
Production publishing: Not approved
```
