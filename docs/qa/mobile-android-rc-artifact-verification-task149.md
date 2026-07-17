# Task 149 - Mobile Android Release-Candidate Artifact Verification

Date: 2026-07-17

## Purpose

Record artifact-level verification for the Android production release-candidate builds generated in Task 149.

This checklist verifies that build artifacts exist and are ready for controlled QA handling. It does not approve public store submission.

## Artifact Summary

| App | Build ID | Artifact type | Build result | Verification status |
| --- | --- | --- | --- | --- |
| Customer App | `ec1716bb-258c-4022-bb8a-1708895920fb` | Android App Bundle (`.aab`) | Passed | Generated |
| KariGO Captain App | `6f0bea0e-9402-4102-bde4-4afc05c078fe` | Android App Bundle (`.aab`) | Passed | Generated |

Direct artifact download URLs must be stored only in secure operational release notes or retrieved from the authenticated Expo dashboard. Do not commit AAB/APK files or direct artifact URLs.

## Pre-Upload Verification Checklist

Customer App:

- [x] EAS build completed successfully.
- [x] Android artifact generated as an app bundle.
- [x] Profile used: `customer-production`.
- [x] Package expected: `com.karigo.customer`.
- [x] Channel expected: `customer-production`.
- [x] No store submission performed.
- [x] No live payment activation performed.

KariGO Captain App:

- [x] EAS build completed successfully.
- [x] Android artifact generated as an app bundle.
- [x] Profile used: `captain-production`.
- [x] Package expected: `com.karigo.rider`.
- [x] Channel expected: `captain-production`.
- [x] No store submission performed.
- [x] No live payment activation performed.

## Controlled QA Steps Still Required

Before approving public distribution:

- [ ] Download artifacts from Expo dashboard using authorized release-manager access.
- [ ] Upload to the approved internal/closed testing track only.
- [ ] Confirm install through the store/internal testing path.
- [ ] Verify Customer App login/signup/OTP/account activation.
- [ ] Verify Customer App home, vendor browsing and checkout guardrails.
- [ ] Verify Customer App live payments remain disabled.
- [ ] Verify KariGO Captain App login and delivery workflow.
- [ ] Verify Ride Captain mode remains readiness-only.
- [ ] Verify no payout, wallet withdrawal or live ride flow is enabled.
- [ ] Record tester names and device OS versions in the release evidence log.

## Blockers

No build-generation blocker was observed for Android release-candidate artifacts.

Remaining release blockers before public store rollout:

- iOS release-candidate builds were not generated in this task.
- Google Play and Apple App Store submission remain unapproved.
- Store metadata, screenshots, privacy labels and review notes still need final approval.
- Live payment activation remains separately gated and disabled.

## Current Decision

```text
Android RC artifact generation: Passed
Artifact QA: Pending
Store upload/submission: Not approved
Public release: Not approved
```
