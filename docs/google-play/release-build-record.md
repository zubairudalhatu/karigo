# Google Play release build record

Status: approved icons integrated. Final icon-bearing AAB builds pending.

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
| Commit | Pending icon integration commit | Pending icon integration commit | Pending icon integration commit |
| Build ID | Pending | Pending | Pending |
| EAS build page / artifact locator | Pending | Pending | Pending |
| Build date (UTC) | Pending | Pending | Pending |
| AAB size | Pending | Pending | Pending |
| AAB SHA-256 | Pending | Pending | Pending |
| Signing credential | Existing Customer credential; verify after build | Existing Captain credential; verify after build | Existing Partner credential; verify after build |
| Signing certificate SHA-1 | Verify after build | Verify after build | Verify after build |
| Target SDK | 36 configured; verify from final manifest | 36 configured; verify from final manifest | 36 configured; verify from final manifest |
| 16 KB page support | Verify final AAB | Verify final AAB | Verify final AAB |

Direct signed download URLs are deliberately not stored in Git. Open the authenticated EAS build page to download each AAB.

Only versionCodes 16, 14 and 6 with the approved icon assets may be uploaded to Play.

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
