# Task 151 - Google Play Upload Execution Record

Date: 2026-07-17

## Purpose

Record the Google Play internal or closed testing upload execution status for KariGO Customer App and KariGO Captain App.

This record is for controlled testing only. It does not approve production publishing, open testing, live payments or public store release.

## Source Build References

| App | Build ID | Profile | Package | Artifact type |
| --- | --- | --- | --- | --- |
| Customer App | `ec1716bb-258c-4022-bb8a-1708895920fb` | `customer-production` | `com.karigo.customer` | Android AAB |
| KariGO Captain App | `6f0bea0e-9402-4102-bde4-4afc05c078fe` | `captain-production` | `com.karigo.rider` | Android AAB |

Direct artifact URLs and downloaded AAB files must not be committed to Git.

## Customer App Upload Record

| Field | Value |
| --- | --- |
| Google Play Console app name | KariGO Customer |
| Package name | `com.karigo.customer` |
| Track used | Internal testing or Closed testing |
| Build ID | `ec1716bb-258c-4022-bb8a-1708895920fb` |
| AAB uploaded | Pending operator evidence |
| Upload result | Pending operator evidence |
| Review status | Pending operator evidence |
| Tester group used | `Tester Group:` |
| Test link status | `Test Link:` |
| Rollout status | Pending; production rollout not approved |
| Upload owner | `Upload Owner:` |
| Notes/blockers | `Notes:` |

## KariGO Captain App Upload Record

| Field | Value |
| --- | --- |
| Google Play Console app name | KariGO Captain |
| Package name | `com.karigo.rider` |
| Track used | Internal testing or Closed testing |
| Build ID | `6f0bea0e-9402-4102-bde4-4afc05c078fe` |
| AAB uploaded | Pending operator evidence |
| Upload result | Pending operator evidence |
| Review status | Pending operator evidence |
| Tester group used | `Tester Group:` |
| Test link status | `Test Link:` |
| Rollout status | Pending; production rollout not approved |
| Upload owner | `Upload Owner:` |
| Notes/blockers | `Notes:` |

## Upload Execution Checklist

- [ ] Release operator confirms Google Play Console access.
- [ ] Release operator selects KariGO Customer.
- [ ] Release operator selects Internal testing or Closed testing only.
- [ ] Customer AAB is retrieved from the authenticated Expo build page or approved release storage.
- [ ] Customer AAB is uploaded without selecting Production.
- [ ] Customer review status is recorded.
- [ ] Customer tester group is configured without committing private emails.
- [ ] Customer testing link is stored in approved private release notes.
- [ ] Release operator selects KariGO Captain.
- [ ] Release operator selects Internal testing or Closed testing only.
- [ ] Captain AAB is retrieved from the authenticated Expo build page or approved release storage.
- [ ] Captain AAB is uploaded without selecting Production.
- [ ] Captain review status is recorded.
- [ ] Captain tester group is configured without committing private emails.
- [ ] Captain testing link is stored in approved private release notes.

## Safety Rules

- Production publishing is not approved.
- Closed or internal testing only.
- Do not promote to Production track.
- Do not enable Open testing unless separately approved.
- Do not include private tester data in Git.
- Do not commit AAB/APK files.
- Do not commit direct Expo artifact URLs or private Play testing links.
- Do not activate live payments.
- Do not collect real customer payments in this testing stage.

## Current Status

```text
Customer upload status: Pending operator evidence
Captain upload status: Pending operator evidence
Tester links: Pending operator evidence
Production publishing: Not approved
Live payments: Disabled
```
