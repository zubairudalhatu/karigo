# Task 150 - Android Closed Testing Upload Record

Date: 2026-07-17

## Purpose

Prepare the Google Play internal or closed testing upload record for KariGO Android release-candidate artifacts.

This record is for controlled testing only. It does not approve production publishing, open testing, live payments, or public app-store release.

## Upload Scope

| App | Google Play app | Target track | Artifact source | Build ID | Package |
| --- | --- | --- | --- | --- | --- |
| Customer App | KariGO Customer | Internal testing or Closed testing | Task 149 Android AAB | `ec1716bb-258c-4022-bb8a-1708895920fb` | `com.karigo.customer` |
| KariGO Captain App | KariGO Captain | Internal testing or Closed testing | Task 153 Android AAB | `79123804-7a58-45ad-807e-d9d87dffea1f` | `com.karigo.rider` |

Direct artifact URLs and downloaded AAB files must not be committed to Git.

Task 153 supersedes the previous Captain Task 149 build `6f0bea0e-9402-4102-bde4-4afc05c078fe` for future Captain closed-testing uploads.

## Intended Upload Location

Customer App:

```text
Console: Google Play Console
App: KariGO Customer
Track: Internal testing or Closed testing
Artifact: Customer Android AAB from Task 149
Build ID: ec1716bb-258c-4022-bb8a-1708895920fb
```

KariGO Captain App:

```text
Console: Google Play Console
App: KariGO Captain
Track: Internal testing or Closed testing
Artifact: Captain Android AAB from Task 153
Build ID: 79123804-7a58-45ad-807e-d9d87dffea1f
```

## Upload Operator Checklist

- [ ] Confirm release operator has Google Play Console access.
- [ ] Confirm the correct Google Play app is selected.
- [ ] Confirm the selected track is internal testing or closed testing.
- [ ] Confirm production track is not selected.
- [ ] Retrieve the AAB from the authenticated Expo build page or approved release storage.
- [ ] Upload the Customer AAB to the Customer app testing track.
- [ ] Upload the Captain AAB to the Captain app testing track.
- [ ] Confirm package names match expected package IDs.
- [ ] Confirm version/build numbers are accepted by Play Console.
- [ ] Add tester groups or tester emails through Play Console only.
- [ ] Share Play testing links only through approved operational channels.
- [ ] Do not paste private tester data, AAB files, screenshots or direct artifact URLs into Git.

## Store Submission Safety Rules

- Upload to internal or closed testing only.
- Do not promote to production.
- Do not enable open testing unless separately approved.
- Do not activate live payments.
- Do not change app package names.
- Do not upload screenshots containing private test data.
- Do not publish direct artifact URLs in Git.
- Do not use public marketing copy that claims live payments, live rides, wallet withdrawals or payout automation.

## Payment Mode Guardrail

```text
Live payments: Disabled
Mock payment: Staging fallback
Monnify: Sandbox/test only
Paystack: Test mode only
Squad: Deferred for launch
```

No real customer payment should be collected during closed testing unless management explicitly approves a controlled live payment test later.

## Upload Evidence Template

| Field | Customer App | KariGO Captain App |
| --- | --- | --- |
| Upload date/time |  |  |
| Upload operator |  |  |
| Google Play app selected |  |  |
| Track selected |  |  |
| Build ID |  |  |
| Artifact type | AAB | AAB |
| Package verified |  |  |
| Tester group configured |  |  |
| Testing link generated | Yes / No | Yes / No |
| Production publish avoided | Yes / No | Yes / No |
| Notes |  |  |

## Current Status

```text
Android AAB artifacts: Generated
Google Play upload: Pending operator action
Testing link distribution: Pending
Production publishing: Not approved
Live payments: Disabled
```
