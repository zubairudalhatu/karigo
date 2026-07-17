# Task 153 - Captain Android Closed Testing Update QA Record

Date: 2026-07-17

## Purpose

Provide the QA record for the updated KariGO Captain Android release-candidate build generated after Task 152.

This record is for Google Play internal or closed testing only. It does not approve public production publishing.

## Current Captain Artifact Reference

| Field | Value |
| --- | --- |
| App | KariGO Captain App |
| EAS project | `@zamkah/karigo-rider` |
| EAS build ID | `79123804-7a58-45ad-807e-d9d87dffea1f` |
| Supersedes build ID | `6f0bea0e-9402-4102-bde4-4afc05c078fe` |
| Profile | `captain-production` |
| Package | `com.karigo.rider` |
| Channel | `captain-production` |
| Artifact type | Android App Bundle (`.aab`) |
| Build result | Passed |

Direct artifact URLs and downloaded AAB files must not be committed to Git.

## Closed Testing Upload Verification

| Check | Expected result | Status |
| --- | --- | --- |
| Correct app selected | Google Play app is KariGO Captain | Pending operator evidence |
| Correct track selected | Internal testing or Closed testing only | Pending operator evidence |
| Production track avoided | No production rollout started | Pending operator evidence |
| Artifact selected | Task 153 Captain AAB is uploaded | Pending operator evidence |
| Package accepted | Package is `com.karigo.rider` | Pending operator evidence |
| Version accepted | Play Console accepts version/build number | Pending operator evidence |
| Tester group configured | Approved tester group only | Pending operator evidence |
| Testing link generated | Link stored outside Git | Pending operator evidence |

## Captain Regression Checklist

| Scenario | Expected result | Status |
| --- | --- | --- |
| Install from Play testing track | App installs successfully | Pending |
| First launch | App opens without crash | Pending |
| Session restore | Existing valid session persists safely | Pending |
| Login | Delivery Captain can log in | Pending |
| Logout | Session clears and returns to auth safely | Pending |
| Bottom navigation | Icons and labels render correctly | Pending |
| Home dashboard | Captain homepage shows polished release-candidate layout | Pending |
| Availability labels | Online/offline states are clear and safe | Pending |
| Assigned delivery | Assigned job appears after Admin dispatch | Pending |
| Pickup flow | Delivery Captain can progress pickup steps | Pending |
| Delivery code completion | Customer-provided code completes delivery | Pending |
| Profile | Profile UI and optional photo URL field behave safely | Pending |
| In-app application flow | Captain application flow submits or shows safe error | Pending |
| Ride mode | Ride Captain remains readiness-only | Pending |
| Live payments/rides | No live payment or live ride flow is enabled | Pending |

## Evidence Rules

- Do not paste tester phone numbers, emails, OTPs, passwords or addresses into this file.
- Do not paste direct Expo artifact URLs or private Play testing links into this file.
- Do not commit screenshots containing sensitive tester data.
- Store private tester evidence only in approved operational channels.

## Current Result

```text
Captain AAB build: Passed
Google Play upload evidence: Pending
Tester install evidence: Pending
Production publishing: Not approved
Live payments: Disabled
Live ride-hailing: Disabled
```
