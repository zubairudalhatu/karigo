# Task 150 - Android Closed Testing Go/No-Go Record

Date: 2026-07-17

## Purpose

Record the launch decision for uploading KariGO Android release candidates to Google Play internal or closed testing.

This Go/No-Go record does not approve production release.

## Decision Scope

| Item | Status |
| --- | --- |
| Customer Android AAB generated | Yes |
| Captain Android AAB generated | Yes |
| Internal/closed testing upload | Pending |
| Production publishing | Not approved |
| Live payments | Disabled |
| Open testing | Not approved |

## Go Criteria

Closed testing may proceed if:

- Customer AAB is available from authorized release storage or Expo dashboard.
- Captain AAB is available from authorized release storage or Expo dashboard.
- Correct Play Console app records exist.
- Correct package names are confirmed.
- Upload target is internal testing or closed testing only.
- Tester group is approved.
- Backend health is green.
- Live payments remain disabled.
- Mock payment remains available.
- Monnify Sandbox and Paystack Test Mode are treated as test-only.
- Squad remains deferred from customer checkout.

## No-Go Criteria

Do not proceed if:

- Package/signing mismatch blocks upload.
- App record or package name is incorrect.
- Tester group is not approved.
- Production track is selected accidentally.
- Live payment flags are enabled without approval.
- App-store metadata claims unsupported live services.
- AAB files, direct artifact URLs, credentials or private tester information would be committed to Git.

## Decision Log

| Date | Decision | Owner | Notes |
| --- | --- | --- | --- |
| 2026-07-17 | Ready to prepare Play internal/closed testing upload | Release operations | Upload not yet performed in repository task. |

## Current Decision

```text
Closed testing upload preparation: Go
Closed testing QA execution: Pending
Production publish: No-Go
Live payment activation: No-Go
```

## Required Signoff Before Production Promotion

- [ ] Closed testing upload completed.
- [ ] Testing links distributed to approved testers only.
- [ ] Customer App smoke test passed.
- [ ] Captain App smoke test passed.
- [ ] Payment guardrails confirmed.
- [ ] No P0/P1 issue open.
- [ ] Legal/privacy/support links checked.
- [ ] Store metadata approved.
- [ ] Production Go/No-Go meeting completed.
