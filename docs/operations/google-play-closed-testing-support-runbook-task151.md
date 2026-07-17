# Task 151 - Google Play Closed Testing Support Runbook

Date: 2026-07-17

## Purpose

Define the support and incident-handling workflow for KariGO Android closed/internal testing through Google Play.

This runbook is for controlled testing only. It does not authorize production publishing or live payments.

## Support Intake

When a tester reports an issue, collect only safe operational details:

- tester code/name;
- app tested;
- device model;
- Android version;
- install source;
- build ID;
- time of issue;
- scenario;
- expected result;
- actual result;
- safe screenshot or video reference;
- severity;
- owner;
- resolution status.

Do not collect or commit private phone numbers, emails, OTPs, passwords, private addresses, payment secrets, direct artifact URLs or Play Console credentials.

## Issue Severity

| Severity | Meaning | Action |
| --- | --- | --- |
| P0 | App cannot install, launch, authenticate broadly, or production payment risk exists | Pause testing immediately |
| P1 | Core Customer checkout or Captain delivery flow fails for most testers | Hold expansion and assign urgent fix |
| P2 | Important but scoped issue with workaround | Track and fix before wider release |
| P3 | Minor copy/layout/usability issue | Backlog or batch fix |

## Common Blockers And Response

| Blocker | Response |
| --- | --- |
| Package/signing rejection | Stop upload, capture safe Play Console message, assign release engineering |
| Play Console policy warning | Capture warning text, assign compliance/product owner |
| Missing privacy policy | Verify public privacy URL and update store listing if needed |
| Missing data safety declaration | Pause upload until store data-safety form is completed |
| App content rating issue | Assign product/compliance owner to complete rating questionnaire |
| Install failure | Confirm tester group, track, device support and package status |
| Login failure | Check backend health, OTP/auth provider status and tester account state |
| Backend unavailable | Pause testing and escalate to backend owner |
| Payment checkout failure | Confirm mock fallback and sandbox provider status; do not enable live payments |
| Crash on launch | Collect device/OS/build ID and assign mobile engineering |
| Captain delivery flow failure | Confirm dispatch/order setup and assign mobile/backend owner |

## Tester Communication Template

```text
Thank you for testing KariGO.

Please report issues with:
- app tested;
- device model;
- Android version;
- time of issue;
- what you tapped or tried;
- what happened;
- safe screenshot/video reference if available.

Do not share OTPs, passwords, private phone numbers or payment details.
```

## Payment Support Rules

- Live payments remain disabled.
- No tester should make a real payment.
- Monnify and Paystack must be treated as sandbox/test only.
- Squad is deferred.
- Mock payment remains fallback.
- If a tester believes they were charged, pause testing and escalate immediately.

## Escalation Path

| Area | Owner |
| --- | --- |
| Play Console upload/signing | Release operator |
| Install/testing link issues | Release operator and QA lead |
| Customer app crash/flow issue | Mobile engineering |
| Captain app crash/flow issue | Mobile engineering |
| Backend/auth/order issue | Backend owner |
| Payment sandbox issue | Payment owner |
| Privacy/store policy issue | Product/compliance owner |

## Current Operations Status

```text
Closed testing support pack: Ready
Tester install evidence: Pending
Production publishing: Not approved
Live payments: Disabled
```
