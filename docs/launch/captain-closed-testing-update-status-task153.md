# Task 153 - Captain Closed Testing Update Status

Date: 2026-07-17

## Purpose

Track the launch status of the updated KariGO Captain Android release-candidate build for Google Play internal or closed testing.

## Updated Build

```text
App: KariGO Captain
EAS project: @zamkah/karigo-rider
Build ID: 79123804-7a58-45ad-807e-d9d87dffea1f
Profile: captain-production
Package: com.karigo.rider
Artifact: Android App Bundle
Status: Build passed
```

This build supersedes the Task 149 Captain build `6f0bea0e-9402-4102-bde4-4afc05c078fe` for future closed-testing updates.

## Update Scope

| Area | Status |
| --- | --- |
| Captain Android release-candidate rebuild | Completed |
| Customer Android rebuild | Not performed |
| Backend redeploy | Not required |
| Admin Portal redeploy | Not required |
| Vendor Dashboard redeploy | Not required |
| Website redeploy | Not required |
| Prisma migration | Not required |
| New native dependency | Not reported for Task 152 |
| Google Play production publish | Not approved |

## Closed Testing Operator Steps

1. Open Google Play Console with authorized release-manager access.
2. Select the KariGO Captain app.
3. Select Internal testing or Closed testing only.
4. Retrieve the Task 153 AAB from the authenticated Expo build page or approved private release storage.
5. Upload the Task 153 AAB.
6. Confirm the package is `com.karigo.rider`.
7. Confirm no Production track rollout is started.
8. Configure only approved tester groups.
9. Store the private testing link outside Git.
10. Record safe install evidence in the Task 153 QA record.

## Go/No-Go

| Decision area | Current status |
| --- | --- |
| Captain build generation | Go |
| Closed testing upload | Pending operator action |
| Tester install verification | Pending |
| Production publishing | No-Go |
| Live payment activation | No-Go |
| Live ride-hailing activation | No-Go |

## Guardrails

```text
Mock payment remains available.
Monnify and Paystack remain sandbox/test candidates only.
Squad by GTBank is now the primary launch payment candidate, with live activation still pending environment verification and approval.
Live payments remain disabled.
Live rides and ride dispatch remain disabled.
No direct artifact URLs, Play testing links, tester data or credentials should be committed.
```
