# Task 163 - Captain Signing Key Upload Verification

Date: 18 July 2026

Purpose: provide a safe verification checklist for resolving the KariGO Captain Google Play signing-key mismatch.

## Current Result

| Area | Status |
| --- | --- |
| Accepted Captain build | `c75e2a76-b2ea-4ce8-9425-cc342a7ba371` |
| Accepted versionCode | `2` |
| Rejected Captain build | `968eae26-7b1e-41da-942c-a27bcd39a01f` |
| Rejected versionCode | `3` |
| Package | `com.karigo.rider` |
| Signing credential corrected | No |
| New AAB generated | No |
| Production publish approved | No |

## Verification Checklist Before Rebuild

| Check | Expected result | Status |
| --- | --- | --- |
| Correct Play app selected | KariGO Captain Play app | Pending |
| Package unchanged | `com.karigo.rider` | Confirmed in repo |
| EAS project unchanged | `344a78dc-69d9-4daa-9616-f100b67f0910` | Confirmed in repo |
| Production profile unchanged | `captain-production` | Confirmed in repo |
| Play expected upload certificate known | Fingerprint confirmed from Play Console | Pending operator action |
| EAS upload certificate matches Play | Current/restored EAS credential matches Play expected certificate | Pending operator action |
| Keystore material handled safely | Private key stays outside Git | Pending operator action |
| New AAB rebuilt after credential fix | Build completes using corrected credential | Pending |
| Google Play upload accepted | Internal testing upload succeeds | Pending |

## Rebuild Command After Credential Correction

Run only after the Play-accepted upload key has been restored to EAS or Google Play has approved an upload-key reset.

```powershell
cd apps/rider-app
npx eas-cli build --platform android --profile captain-production --non-interactive
```

## Upload Verification

After the corrected AAB is built:

1. Upload to Google Play internal testing only.
2. Confirm package `com.karigo.rider`.
3. Confirm versionCode `3`, or `4` if Play requires a new versionCode after rejection.
4. Confirm Play no longer shows the signing-key mismatch.
5. Do not promote to production.
6. Record the new EAS build ID and safe upload status here.

## Evidence Rules

- Do not commit direct Expo artifact URLs.
- Do not commit Google Play testing links.
- Do not commit keystore files or `credentials.json`.
- Do not commit tester data, passwords, OTPs or screenshots containing sensitive data.
