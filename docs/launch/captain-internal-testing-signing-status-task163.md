# Task 163 - Captain Internal Testing Signing Status

Date: 18 July 2026

Purpose: record the launch impact of the KariGO Captain Play signing-key mismatch.

## Status

```text
Customer AAB: Uploaded successfully
Captain AAB versionCode 3: Rejected by Google Play signing-key check
Production publishing: Not approved
```

## Impact

| Area | Status |
| --- | --- |
| Customer App internal testing | Not blocked by this issue |
| Captain App internal testing update | Blocked until signing credential is corrected |
| Backend redeploy | Not required |
| Admin Portal redeploy | Not required |
| Vendor Dashboard redeploy | Not required |
| Website redeploy | Not required |
| Prisma migration | Not required |
| Production publishing | No-Go |

## Required Operator Action

Resolve the Captain upload-key mismatch before another Play upload attempt:

1. Compare the Google Play Console expected upload certificate for `com.karigo.rider` with the current EAS Android upload credential.
2. If the original Play-accepted upload key is available, restore it into EAS for `@zamkah/karigo-rider` and `com.karigo.rider`.
3. If the original key is unavailable, start the official Google Play upload-key reset process.
4. After credential correction, rebuild the Captain production AAB.
5. Upload only to internal testing.

## Build References

| Purpose | Build ID | Version code |
| --- | --- | --- |
| Previously accepted Captain AAB | `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` | `2` |
| Rejected Captain AAB | `968eae26-7b1e-41da-942c-a27bcd39a01f` | `3` |

## Guardrails

- Do not change package `com.karigo.rider`.
- Do not create a second Captain Play app.
- Do not publish to production.
- Do not commit keystore files, credentials, AAB/APK files, artifact URLs or Play testing links.
