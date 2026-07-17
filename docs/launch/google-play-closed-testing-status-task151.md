# Task 151 - Google Play Closed Testing Status

Date: 2026-07-17

## Purpose

Record the closed/internal testing launch status for KariGO Android release candidates.

This status document does not approve production publishing.

## Current Status

| Area | Customer App | KariGO Captain App |
| --- | --- | --- |
| Build ID | `ec1716bb-258c-4022-bb8a-1708895920fb` | `6f0bea0e-9402-4102-bde4-4afc05c078fe` |
| Package | `com.karigo.customer` | `com.karigo.rider` |
| Track | Internal testing or Closed testing | Internal testing or Closed testing |
| AAB upload | Pending operator evidence | Pending operator evidence |
| Review status | Pending operator evidence | Pending operator evidence |
| Test link status | Pending operator evidence | Pending operator evidence |
| Tester install status | Pending | Pending |
| Production publish | Not approved | Not approved |

## Go Criteria

Proceed with closed testing if:

- both apps upload successfully to Internal testing or Closed testing;
- tester links are available only to approved testers;
- testers can install both apps;
- login/register works;
- Customer checkout reaches payment selection;
- Mock payment works as fallback;
- Monnify Sandbox and Paystack Test Mode are confirmed or safely fail with clear messaging;
- Captain delivery flow can be completed;
- backend health remains stable;
- no P0/P1 crash or install blocker exists.

## No-Go Criteria

Pause or hold closed testing if:

- app cannot be installed;
- login fails broadly;
- backend is unavailable;
- payment flow blocks all checkout paths;
- Customer App crashes during checkout;
- Captain App cannot complete delivery flow;
- legal/privacy links are missing;
- package/signing issue blocks upload;
- live payments are enabled without approval;
- private tester data or artifact links would be exposed.

## Blocker Register

| Issue | Affected app | Severity | Owner | Required fix | Status | Go/No-Go impact |
| --- | --- | --- | --- | --- | --- | --- |
| Package/signing rejection | Customer / Captain |  |  |  | Not reported |  |
| Play Console policy warning | Customer / Captain |  |  |  | Not reported |  |
| Missing privacy policy | Customer / Captain |  |  |  | Not reported |  |
| Missing data safety declaration | Customer / Captain |  |  |  | Not reported |  |
| App content rating issue | Customer / Captain |  |  |  | Not reported |  |
| Install failure | Customer / Captain |  |  |  | Not reported |  |
| Login failure | Customer / Captain |  |  |  | Not reported |  |
| Backend unavailable | Customer / Captain |  |  |  | Not reported |  |
| Payment checkout failure | Customer |  |  |  | Not reported |  |
| Crash on launch | Customer / Captain |  |  |  | Not reported |  |
| Captain delivery flow failure | Captain |  |  |  | Not reported |  |

## Decision

```text
Google Play upload execution: Pending operator evidence
Closed testing start: Pending tester link confirmation
Production publishing: No-Go
Live payment activation: No-Go
```
