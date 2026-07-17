# Task 154 - Captain Internal Testing Upload Status

Date: 2026-07-17

## Purpose

Track the status of the KariGO Captain Google Play internal or closed testing upload retry after the Android version code bump.

## Current Build To Upload

```text
App: KariGO Captain
Package: com.karigo.rider
EAS project: @zamkah/karigo-rider
Build ID: c75e2a76-b2ea-4ce8-9425-cc342a7ba371
Profile: captain-production
Android versionCode: 2
Artifact: Android App Bundle
Build status: Passed
```

## Superseded Build

```text
Previous Task 153 build: 79123804-7a58-45ad-807e-d9d87dffea1f
Previous versionCode: 1
Reason superseded: Google Play reported versionCode 1 had already been used.
```

## Upload Instruction

1. Open Google Play Console with authorized release-manager access.
2. Select the KariGO Captain app.
3. Select Internal testing or Closed testing only.
4. Retrieve the Task 154 AAB from the authenticated Expo build page or approved private release storage.
5. Upload build `c75e2a76-b2ea-4ce8-9425-cc342a7ba371`.
6. Confirm Google Play accepts Android `versionCode` `2`.
7. Confirm no Production track rollout is started.
8. Configure only approved tester groups.
9. Store private Play testing links outside Git.
10. Record safe installation evidence in the Task 154 QA document.

## Release Impact

| Area | Status |
| --- | --- |
| Captain Android versionCode | Updated to `2` |
| Captain AAB rebuild | Completed |
| Customer App | Not affected |
| Backend redeploy | Not required |
| Admin Portal redeploy | Not required |
| Vendor Dashboard redeploy | Not required |
| Website redeploy | Not required |
| Prisma migration | Not required |
| Production publish | Not approved |

## Go/No-Go

| Decision area | Current status |
| --- | --- |
| Captain build generation | Go |
| Google Play upload retry | Ready for operator action |
| Closed/internal testing | Pending upload/install evidence |
| Production publishing | No-Go |
| Live payment activation | No-Go |
| Live ride-hailing activation | No-Go |

## Guardrails

```text
Live payments remain disabled.
Live rides and ride dispatch remain disabled.
Do not upload to Production track.
Do not commit AAB/APK files, direct artifact URLs, Play links, tester data or credentials.
```
