# Google Play release build record

Status: final hardened AABs built and locally verified. Play Console upload remains owner-controlled.

| Field | Customer | Captain | Partner |
| --- | --- | --- | --- |
| App version | 1.0.0 | 1.0.0 | 1.0.0 |
| Runtime | 1.0.0 | 1.0.0 | 1.0.0 |
| versionCode | 15 | 13 | 5 |
| Package | `com.karigo.customer` | `com.karigo.rider` | `com.karigo.partner` |
| EAS project ID | `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d` | `344a78dc-69d9-4daa-9616-f100b67f0910` | `44e595bd-739a-430f-8d4d-99e961ac2451` |
| Channel | `customer-production` | `captain-production` | `partner-production` |
| Build profile | `customer-play-internal` | `captain-play-internal` | `partner-play-internal` |
| Build environment | EAS `production` | EAS `production` | EAS `production` |
| Commit | `2c1fb8654a60a47a4a07dac2ecdd41503b7aea92` | `2c1fb8654a60a47a4a07dac2ecdd41503b7aea92` | `2c1fb8654a60a47a4a07dac2ecdd41503b7aea92` |
| Build ID | `70d952a9-6fb4-45e9-a68d-05ee64723807` | `f7afbcd7-bf24-422b-8ed9-948042cbdce3` | `effbe636-d5f4-4aa0-b69b-d1df7d1270d3` |
| EAS build page / artifact locator | [Customer build](https://expo.dev/accounts/zamkah/projects/karigo-customer/builds/70d952a9-6fb4-45e9-a68d-05ee64723807) | [Captain build](https://expo.dev/accounts/zamkah/projects/karigo-rider/builds/f7afbcd7-bf24-422b-8ed9-948042cbdce3) | [Partner build](https://expo.dev/accounts/zamkah/projects/karigo-partner/builds/effbe636-d5f4-4aa0-b69b-d1df7d1270d3) |
| Build date (UTC) | 2026-08-04 | 2026-08-04 | 2026-08-04 |
| AAB size | 51,234,498 bytes (48.86 MiB) | 51,272,012 bytes (48.90 MiB) | 50,295,571 bytes (47.97 MiB) |
| AAB SHA-256 | `EA4B6F2E6E7440D3CBC990C123FB6C2A6C96141E224FEE3B15BAB90F1F38AD04` | `6DB977FAAABFC30F2E78BFE2F428DF8C9B372600F5B88D4B6E70A374C67BC98F` | `0078217727189964E85F079B5B47234977CB8993CD25889BD6AEEEE19445A3BE` |
| Signing credential | `Build Credentials qRw3aDBl_Q` | `Build Credentials -nhoY2MyO-` | `Build Credentials 4bDdvvWHuu` |
| Signing certificate SHA-1 | `17:CE:4B:B0:42:F0:C4:1B:21:0B:96:F6:A1:B0:39:9D:24:EB:C1:D9` | `5D:12:EF:B8:3A:F3:07:B3:D2:57:65:65:58:7B:22:28:56:24:E0:20` | `02:62:05:41:7D:B0:5A:06:76:BB:5F:E5:5A:28:AB:03:99:1F:7E:86` |
| Target SDK | 36 verified from merged AAB manifest | 36 verified from merged AAB manifest | 36 verified from merged AAB manifest |
| 16 KB page support | Passed for all 64-bit libraries | Passed for all 64-bit libraries | Passed for all 64-bit libraries |

Direct signed download URLs are deliberately not stored in Git. Open the authenticated EAS build page to download each AAB.

All three builds report `FINISHED`, use Store distribution and were produced from the same committed source. They have not been submitted to Google Play by this task.

## Superseded inspection builds

The first 1.0.0 artifacts were used only for manifest inspection and must not be uploaded to Play:

- Customer `18a93520-8974-4489-b665-5c1710a8b14d`, versionCode 14.
- Captain `4819ec87-0aa7-4a54-b0fd-30843ca3eb09`, versionCode 12.
- Partner `7eae46bf-5678-4dfc-a678-d2a84f62c1e3`, versionCode 4.

Inspection found an unnecessary overlay permission. Customer and Partner also carried camera/write-storage permissions that their gallery-only upload flows do not use. The final builds use new version codes after those permissions and Android backup were blocked.
