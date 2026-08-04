# Google Play release build record

Status: preparation in progress. Fill build evidence only from successful EAS results.

| Field | Customer | Captain | Partner |
| --- | --- | --- | --- |
| App version | 1.0.0 | 1.0.0 | 1.0.0 |
| Runtime | 1.0.0 | 1.0.0 | 1.0.0 |
| versionCode | 15 | 13 | 5 |
| Package | `com.karigo.customer` | `com.karigo.rider` | `com.karigo.partner` |
| EAS project ID | `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d` | `344a78dc-69d9-4daa-9616-f100b67f0910` | `44e595bd-739a-430f-8d4d-99e961ac2451` |
| Channel | `customer-production` | `captain-production` | `partner-production` |
| Build profile | `customer-play-internal` | `captain-play-internal` | `partner-play-internal` |
| Commit | Pending | Pending | Pending |
| Build ID | Pending | Pending | Pending |
| EAS build page / artifact locator | Pending | Pending | Pending |
| Build date | Pending | Pending | Pending |
| AAB size | Pending | Pending | Pending |
| Signing certificate SHA-1 | Pending local artifact inspection | Pending local artifact inspection | Pending local artifact inspection |
| Target SDK | 36 configured; AAB verification pending | 36 configured; AAB verification pending | 36 configured; AAB verification pending |
| 16 KB page support | AAB verification pending | AAB verification pending | AAB verification pending |

Direct signed download URLs are deliberately not stored in Git. Open the authenticated EAS build page to download each AAB.

## Superseded inspection builds

The first 1.0.0 artifacts were used only for manifest inspection and must not be uploaded to Play:

- Customer `18a93520-8974-4489-b665-5c1710a8b14d`, versionCode 14.
- Captain `4819ec87-0aa7-4a54-b0fd-30843ca3eb09`, versionCode 12.
- Partner `7eae46bf-5678-4dfc-a678-d2a84f62c1e3`, versionCode 4.

Inspection found an unnecessary overlay permission. Customer and Partner also carried camera/write-storage permissions that their gallery-only upload flows do not use. The final builds use new version codes after those permissions and Android backup were blocked.
