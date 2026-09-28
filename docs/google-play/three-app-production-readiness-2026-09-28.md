# Task 209B-S1-H11.2F — three-app replacement AAB and Google Play production readiness

Date: 28 September 2026  
Branch: `codex/dependency-security-remediation`  
Repository HEAD: `e81d516d205052a4010b6fc7560f54e156782042`  
Remote baseline: `origin/main` `ebf58772491fa57278b3630c407278aea1f8a977`

## Outcome

The three replacement Android App Bundles were built with EAS production profiles, downloaded, hash-checked, inspected, and added to Google Play release drafts. No release was sent for review, rolled out, or submitted. No country, signing-key, or Play App Signing setting was changed.

Five Play drafts are saved:

| App | Track | Draft artifact | Target SDK | Release notes | State |
| --- | --- | --- | ---: | --- | --- |
| Customer | Production | `18 (1.1.0)` | 36 | Compliance and reliability improvements, updated Android compatibility, and permission handling refinements. | Saved; stopped on Create release before Preview/Send for review |
| Captain | Production | `17 (1.2.0)` | 36 | Improved active-work location controls, Android compatibility, and reliability updates. | Saved; stopped on Create release before Preview/Send for review |
| Captain | Closed testing — Alpha | `17 (1.2.0)` | 36 | Improved active-work location controls, Android compatibility, and reliability updates. | Saved; existing active Alpha 14 is not yet replaced until the draft is reviewed/released |
| Partner | Production | `7 (1.0.0)` | 36 | Improved media permission handling, Android compatibility, and reliability updates. | Saved; stopped on Create release before Preview/Send for review |
| Partner | Closed testing — Alpha | `7 (1.0.0)` | 36 | Improved media permission handling, Android compatibility, and reliability updates. | Saved; existing active Alpha 6 is not yet replaced until the draft is reviewed/released |

## Build and artifact record

All builds use owner `zamkah` and the existing package identities and remote signing credentials. The source state for the release candidates is `e81d516d205052a4010b6fc7560f54e156782042`. Validation used Node `22.23.2`, npm `10.9.8`, Expo 53 and React Native 0.79.6. Partner declares EAS runtime policy `appVersion`; Customer and Captain do not declare a separate `runtimeVersion` in `app.json`, so their app versions are recorded instead of inventing a runtime identifier.

| Field | Customer | Captain | Partner |
| --- | --- | --- | --- |
| Package | `com.karigo.customer` | `com.karigo.rider` | `com.karigo.partner` |
| Version / code | `1.1.0` / `18` | `1.2.0` / `17` | `1.0.0` / `7` |
| EAS build ID | `af8627d5-c5c0-4d75-88ed-49a140046671` | `93002a31-2d4b-41e8-8bbe-075ffdb20790` | `5ad8f40d-2f35-420e-be11-460cd3d54ea2` |
| Build result | Finished | Finished | Finished |
| AAB bytes | 190,126,698 | 190,090,961 | 50,312,154 |
| SHA-256 | `7B99804549AC3887D88AD1103F3CC97A8FDA2AB7547B620A3C53FA16D0FFD8CA` | `DC5D5F7C2F0A61D6FD47BB9E6FA1915CE2C91BFB896764142C2EE9027AC3A3E5` | `3F920E35D9FC2CF565ABC9AA50C5E1846E590DD7E75B63A10326F202165FC329` |
| Native dependency/config fingerprint* | `88B2BD04C28CB550C910E3A06C5664237CADDC64476A86E518E7793B182750F7` | `EC30700F25B045F19BB7E4FC488A9D974FCE0B74B2540BCF253EC6B7598322EB` | `A7EA53FE029B4BAECE68308AED3326C09BCB0FF2CAC9121EE8882C344906EFD4` |

\* SHA-256 over the final `package-lock.json`, app `package.json`, `app.json`, and `eas.json`, concatenated in that order. This is a local reproducibility fingerprint, not an EAS attestation.

Authenticated EAS artifacts:

- Customer: `https://expo.dev/artifacts/eas/tjB1zRNqL-8CBioMU2wJbPJormjIXF-lS5ih6qz-1EQ.aab`
- Captain: `https://expo.dev/artifacts/eas/P6R7vNV_mlRVFzEOD4pM9N7wM3fbdvoJ7MAcwgqf4-A.aab`
- Partner: `https://expo.dev/artifacts/eas/fiUN3QIgCceo1GyA2eskDDH25jlFtjK8RqBL2KU_V8I.aab`

## Validation and artifact inspection

Final validation passed: clean `npm ci`; Prisma schema validation and generation; all workspace typechecks; backend build and 102 suites/996 tests; Admin, Partner Workspace, and Website regression/build checks; Customer, Captain, and Partner mobile regressions; Captain location and Play-compliance checks; production-copy audit; and Expo Doctor 18/18 for all three apps. No database mutation occurred.

`bundletool validate` and `jarsigner -verify` passed for all three AABs. Each artifact has the expected package, version code, target SDK 36, four ABIs including 64-bit `arm64-v8a` and `x86_64`, and 16 KB-compatible native-load alignment.

Permission result:

- Customer: coarse/fine location, microphone and generic foreground service remain for implemented flows. No camera, background location, typed foreground-service permission, broad storage/media, overlay, or media-projection permission.
- Captain: coarse/fine/background location, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, microphone and camera remain for accepted-work tracking and explicit call/camera flows. No broad storage/media, overlay, or media-projection permission.
- Partner: no camera, microphone, storage/media, device location, foreground-service, overlay, or media-projection permission.

## Production-readiness matrix

| Gate | Customer | Captain | Partner |
| --- | --- | --- | --- |
| Current Play status | Production code 9 active; code 18 Production draft saved | No Production release; code 17 Production draft saved; Alpha 14 active and Alpha 17 draft saved; Internal 16 remains active | No Production release; code 7 Production draft saved; Alpha 6 active and Alpha 7 draft saved; Internal 3 remains active |
| Replacement artifact | 1.1.0 / 18; verified | 1.2.0 / 17; verified | 1.0.0 / 7; verified |
| API / 64-bit / 16 KB | 36 / pass / pass | 36 / pass / pass | 36 / pass / pass |
| Permission audit | Replacement removes stale media-projection and broad media/storage exposure | Required accepted-work background location/location FGS retained; media-projection and broad storage removed | Broad media/storage, overlay and unnecessary hardware permissions removed |
| Policy status | Earlier audit recorded API 36 warning against active code 9 and an overdue FGS declaration; replacement resolves binary API/permission causes but Console declaration still needs reconciliation | Earlier Policy status showed no general issue; separate location FGS and background-location evidence gates remain | Earlier Policy status showed no issue; final declarations still depend on evidence review |
| Data Safety | **Not confirmed.** Partial draft and provider/data-type decisions remain open | **Not confirmed.** Provider/data-type decisions remain open | **Not confirmed.** Provider/data-type decisions remain open |
| Reviewer access | Dedicated non-personal account not verified | Dedicated non-personal approved Captain account not verified | Dedicated non-personal approved Partner account not verified |
| Privacy / deletion | Public URLs work; Zamkah ownership/controller corrections are local and undeployed; live dedicated-account deletion test missing | Same; role-access versus full-account deletion requires clean-device confirmation | Same; Partner-access versus full-account deletion requires clean-device confirmation |
| Foreground service | Generic FGS exists; remove obsolete media-projection declaration and reconcile the actual replacement behavior | Legitimate location FGS; Console declaration and physical-device evidence incomplete | No FGS permission in replacement |
| Background location | Not declared or used | Present only for accepted/in-progress work; implementation checks passed, physical-device lifecycle evidence is missing | Not declared or used |
| Location video | Not applicable | **Missing.** The prior link is invalid; a current code-17 real-device recording is required | Not applicable |
| Pre-launch report | No replacement report generated | No replacement report generated | No replacement report generated |
| Android vitals | Insufficient/unavailable data; not a pass | Insufficient/unavailable data; not a pass | Insufficient/unavailable data; not a pass |
| Country availability | Active Production Nigeria only; unchanged | Production track currently shows 0 countries/regions; active Alpha is Nigeria only; unchanged | Active Alpha Nigeria only; a pre-existing queued Production Nigeria addition remains; unchanged by this task |
| Test-artifact cleanup | Closed 16 and Internal 17 still exist; assess after replacement QA | Alpha 14 and Internal 16 remain active until code 17 replacement is reviewed/released | Alpha 6 and Internal 3 remain active until code 7 replacement is reviewed/released |
| Device QA | Required flows not executed from Play code 18 on a physical clean device | Full assignment, permission, minimized tracking, stop, and commission flows not executed from Play code 17 | Onboarding, picker, catalogue/order/service, terms and deletion flows not executed from Play code 7 |

## Blockers and exact next Play actions

### Customer — BLOCKED

Specific blockers: evidence-based Data Safety completion; verified dedicated reviewer account and instructions; corrected privacy/ownership copy deployed and live deletion exercised; actual FGS declaration reconciled; Customer content-rating/UGC and listing evidence finalized; replacement pre-launch and clean-device QA completed; Android vitals reviewed when data is available.

Exact next Play action after those gates pass and the owner approves this exact artifact: open the saved Production code 18 draft, select **Next**, review the summary, and stop immediately before **Send for review** for final owner authorization. Do not change Nigeria-only availability.

### Captain — BLOCKED

Specific blockers: current public background-location demonstration video for code 17; physical-device verification of disclosure, permission ordering, accepted-work-only tracking, foreground notification and stop behavior; completed location FGS/background-location declarations; evidence-based Data Safety; dedicated approved reviewer account; privacy/deletion validation; replacement pre-launch QA; active Alpha/Internal artifact reconciliation; Production country configuration remains unset and requires separate Nigeria-only approval.

Exact next Play actions after those gates pass: first review the saved Alpha code 17 replacement and stop before sending it for review; after it replaces Alpha 14 and device QA passes, configure Production for Nigeria only under explicit country authorization, preview the saved Production code 17 release, and stop immediately before **Send for review** for final owner authorization.

### Partner — BLOCKED

Specific blockers: evidence-based Data Safety; dedicated approved reviewer account; privacy/deletion and catalogue/content-rating reconciliation; replacement pre-launch and clean-device QA; active Alpha/Internal artifact reconciliation; verify the pre-existing pending Nigeria country change before Production review.

Exact next Play actions after those gates pass: review the saved Alpha code 7 replacement and stop before sending it for review; after it replaces Alpha 6 and device QA passes, verify Nigeria-only Production availability, preview the saved Production code 7 release, and stop immediately before **Send for review** for final owner authorization.

## Overall classification

- Customer: **BLOCKED — declarations, reviewer/provider evidence, privacy deployment, pre-launch and device QA remain incomplete.**
- Captain: **BLOCKED — current location video, location/FGS declarations, reviewer/provider evidence, country setup, pre-launch and physical-device lifecycle QA remain incomplete.**
- Partner: **BLOCKED — reviewer/provider evidence, privacy/content reconciliation, country verification, pre-launch and physical-device QA remain incomplete.**

The saved drafts are technically consistent with the intended replacement artifacts. They are not authorization to submit, release, or roll out.
