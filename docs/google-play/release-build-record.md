# Google Play release build record

Status: final approved-icon AABs built and technically verified. Google Play Internal testing upload pending.

| Field | Customer | Captain | Partner |
| --- | --- | --- | --- |
| App version | 1.0.0 | 1.0.0 | 1.0.0 |
| Runtime | 1.0.0 | 1.0.0 | 1.0.0 |
| versionCode | 16 | 14 | 6 |
| Package | `com.karigo.customer` | `com.karigo.rider` | `com.karigo.partner` |
| EAS project ID | `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d` | `344a78dc-69d9-4daa-9616-f100b67f0910` | `44e595bd-739a-430f-8d4d-99e961ac2451` |
| Channel | `customer-production` | `captain-production` | `partner-production` |
| Build profile | `customer-play-internal` | `captain-play-internal` | `partner-play-internal` |
| Build environment | EAS `production` | EAS `production` | EAS `production` |
| Commit | `94c66e22cd2c0fb043b1e45d52591d6eb7fc30f6` | `94c66e22cd2c0fb043b1e45d52591d6eb7fc30f6` | `94c66e22cd2c0fb043b1e45d52591d6eb7fc30f6` |
| Build ID | `c64a4b43-208e-4c88-8420-6f1cb41b8ec4` | `237dbfb9-96c9-442c-88f4-8a8d83ca7112` | `610ee33e-24ce-4b05-8195-8adc36898886` |
| EAS build page / artifact locator | [Customer build](https://expo.dev/accounts/zamkah/projects/karigo-customer/builds/c64a4b43-208e-4c88-8420-6f1cb41b8ec4) | [Captain build](https://expo.dev/accounts/zamkah/projects/karigo-rider/builds/237dbfb9-96c9-442c-88f4-8a8d83ca7112) | [Partner build](https://expo.dev/accounts/zamkah/projects/karigo-partner/builds/610ee33e-24ce-4b05-8195-8adc36898886) |
| Build completed (UTC) | 2026-08-04 07:24:30 | 2026-08-04 07:39:51 | 2026-08-04 07:40:01 |
| AAB size | 51,226,399 bytes | 51,254,398 bytes | 50,297,802 bytes |
| AAB SHA-256 | `9A9805F221B542B1A7D9CC3129F2598F4B31D6B61DEC561D2B9E8C9C22F7FE17` | `2CF37E52F14B85132F7643AE6BAA935481A4B8EB123DD49281AA1987C626FCB3` | `87C395DDA4C4750047A31F55C8023A30D82B76D296BBBB5D8030413254930C10` |
| Signing credential | Existing Customer remote credential verified | Existing Captain remote credential verified | Existing Partner remote credential verified |
| Signing certificate SHA-1 | `17:CE:4B:B0:42:F0:C4:1B:21:0B:96:F6:A1:B0:39:9D:24:EB:C1:D9` | `5D:12:EF:B8:3A:F3:07:B3:D2:57:65:65:58:7B:22:28:56:24:E0:20` | `02:62:05:41:7D:B0:5A:06:76:BB:5F:E5:5A:28:AB:03:99:1F:7E:86` |
| Target SDK | 36 verified from final manifest | 36 verified from final manifest | 36 verified from final manifest |
| 16 KB page support | Passed for all 64-bit libraries | Passed for all 64-bit libraries | Passed for all 64-bit libraries |

Direct signed download URLs are deliberately not stored in Git. Open the authenticated EAS build page to download each AAB.

Only versionCodes 16, 14 and 6 with the approved icon assets may be uploaded to Play.

Compiled AAB inspection confirmed that the pre-Android-8 legacy and round launchers contain each app's full approved composition, while adaptive and themed resources contain only the corrected KariGO K mark.

## Superseded inspection builds

The first 1.0.0 artifacts were used only for manifest inspection and must not be uploaded to Play:

- Customer `18a93520-8974-4489-b665-5c1710a8b14d`, versionCode 14.
- Captain `4819ec87-0aa7-4a54-b0fd-30843ca3eb09`, versionCode 12.
- Partner `7eae46bf-5678-4dfc-a678-d2a84f62c1e3`, versionCode 4.

The hardened Task 208B builds are also superseded by the approved icon release and must not be uploaded:

- Customer `70d952a9-6fb4-45e9-a68d-05ee64723807`, versionCode 15.
- Captain `f7afbcd7-bf24-422b-8ed9-948042cbdce3`, versionCode 13.
- Partner `effbe636-d5f4-4aa0-b69b-d1df7d1270d3`, versionCode 5.

The first Task 208B-A1 icon builds were used to inspect compiled Android resources and must not be uploaded:

- Customer `815ecd34-70ac-4f15-8b33-13138e962cff`, versionCode 16.
- Captain `aa031990-0776-434d-aea7-e590c311846b`, versionCode 14.
- Partner `392cbbf7-6c72-4f37-ba28-ca7fbee6640e`, versionCode 6.

Those artifacts contained the correct adaptive K foreground, but Expo's generated pre-Android-8 launcher raster used only that foreground instead of the approved full fallback composition. A deterministic native resource override now preserves the full approved fallback at every Android density while leaving adaptive and themed icons unchanged.

Inspection found an unnecessary overlay permission. Customer and Partner also carried camera/write-storage permissions that their gallery-only upload flows do not use. The final builds use new version codes after those permissions and Android backup were blocked.
