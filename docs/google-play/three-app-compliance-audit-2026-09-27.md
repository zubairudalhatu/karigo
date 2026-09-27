# Task 209B-S1-H11.2D — three-app compliance audit

Audit date: 27 September 2026. Overall result: **D — BLOCKED: owner/legal evidence and release validation required.** Source fixes implemented; replacement AABs are required. This is not a certification of compliance. Existing Console completion badges do not establish accurate declarations.

Baseline: main `da2bfd53a270ec8ddedc6109d65fe0500526e1cc`. Live Render backend commit `de3bbdccf17570bbeead4b18b3e9413d50048f74` differs, but the intervening tracked changes are website-only, so backend source did not change between those commits. Local fixes have not been pushed or deployed.

## Three-app matrix

| # / Check | Customer | Captain | Partner |
|---|---|---|---|
| 1 Package | com.karigo.customer | com.karigo.rider | com.karigo.partner |
| 2 Production | Published; public Nigeria listing available | No active production release; closed/internal testing | No active production release; pre-existing production draft |
| 3 Production version/code | 0.1.0 / 9; closed1.0.0/16, internal1.1.0/17 | None; closed1.0.0/14, internal1.2.0/16 | None; closed1.0.0/6, internal0.1.0/3 |
| 4 Target API | Production35; closed/internal36. Console warns updates require36 | Active testing artifacts36 | Active testing artifacts36 |
| 5 64-bit | Active artifacts arm64 and x86_64, plus32-bit ABIs | Same | Same |
| 6 16KB | Play bundle details: Supports for9/16/17 | Supports for14/16 | Supports for6/3 |
| 7 Policy status, final recheck | API36 update warning, enforced31Aug2026 | No issues found on Policy status; separate FGS blocker remains | No issues found on Policy status |
| 8 App content | 10 actioned;1 overdue FGS declaration. All visible sections opened; data accuracy unresolved | 11 actioned;1 overdue FGS declaration. All visible sections opened; data accuracy unresolved | 10 actioned; Need attention clear. Data accuracy unresolved despite badge |
| 9 Privacy | Public HTTPS link works; local owner/data-flow correction prepared, undeployed | Same shared policy; background/calling detail added locally | Non-www Console URL resolves; same shared local correction |
| 10 Ads | No→Yes saved, not submitted. Sponsored Vendor/External campaigns verified in closed-build source94c66e22 | Yes→No saved, not submitted; no implemented advertising found | No retained; no ad rendering found |
| 11 App access | Existing credentials not proven dedicated;3-character instructions inadequate | Existing credentials not proven dedicated; instructions blank | Existing credentials not proven dedicated; instructions blank |
| 12 Target audience | 18+; minors blocked | 18+; minors exclusion not checked | 18+; minors exclusion not checked |
| 13 Content rating | Existing Everyone/PEGI3; no descriptors. Reconcile interactions/location and UGC controls before next questionnaire | New questionnaire saved: Everyone/PEGI3/IARC3+, Users Interact/Shares Location; GermanyUSK16+ communication risk | Existing Everyone/PEGI3; no descriptors. Catalogue UGC/interaction questionnaire still requires final reconciliation |
| 14 Data safety | Live No collection is inaccurate; partial draft now Yes and19 data types selected. Handling/provider decisions unfinished | Retention/purpose corrections saved in partial draft; provider/category questions unresolved; unsupported OAuth unchecked and saved | Retention/purpose corrections saved in partial draft; provider/category questions unresolved; unsupported OAuth unchecked and saved |
| 15 Deletion | In-app/web request paths; public URL works; mocked backend tests pass. Live dedicated-account test outstanding | Same, including role-access versus full-account choice | Same, including Partner-access versus full-account choice |
| 16 Financial | BNPL removed; payments/wallet retained. Owner confirms no credit/installments anywhere | Existing Other says driver earnings; classification needs review, no unsupported change | Existing None; actual settlement/onboarding flows require careful category mapping |
| 17 Health | None declared; pharmacy placeholder not evidence of live health service. Recheck if activated | None declared | None declared; approved catalogue restrictions require operational review |
| 18 Permissions | Active legacy storage; internal17 unnecessary media-projection. Local blockers added | Internal16 background/location/audio and unnecessary media-projection/storage; local correction | Closed6 READ_EXTERNAL_STORAGE; internal3 camera/audio/overlay/read-write storage; local blockers |
| 19 Background location | No background permission/use found | Internal16 requests it. Prominent disclosure/accepted-work gate/stop logic added locally; video missing | No device GPS/background location found |
| 20 FGS | Overdue declaration; remove unjustified media-projection in new bundle, do not invent use | Overdue; legitimate location needs verified demonstration, media-projection should be removed | No FGS declaration surfaced |
| 21 Photo/video | Gallery picker now avoids broad permission; native blockers require new AAB | Gallery picker corrected; camera permission remains only for chosen camera action | Gallery picker corrected; document picker retained |
| 22 Signing | Play signing active, key In use, upload cert shown; unchanged | Same | Same |
| 23 Pre-launch | No generated report available | No generated report available | No generated report available |
| 24 Vitals | Insufficient/unavailable crash/ANR/startup/battery data; not a pass | Same | Same |
| 25 Listing | Live; staging/launch placeholders and mixed-platform screenshot appearance need replacement with actual Android captures | Public listing unavailable; Console description inspected;4 screenshots, sampled935x2048, feature1024x500. Mixed device framing/personal greeting should be replaced with verified Android review captures | Live Console listing,6 phone screenshots; sampled935x2048, icon512sq, feature1024x500. Personal greeting/sample account should be replaced with dedicated demo persona |
| 26 Countries | Production Nigeria only verified | Closed alpha Nigeria only verified | Closed alpha Nigeria only; pre-existing pending production country addition Nigeria |
| 27 Warnings | API36, FGS, inaccurate collection/Ads, reviewer evidence | FGS, missing video, reviewer/sharing evidence, UGC controls | Reviewer/sharing evidence; existing country change is separate |
| 28 Fixes | Ads/BNPL saved; partial Data safety; local picker/permissions/privacy/owner/dependencies | Ads/rating saved; partial Data safety; local background/picker/permissions/privacy | Partial Data safety; local picker/permissions/privacy |
| 29 Remaining | Complete evidence-based Data safety, reviewer validation, rating/UGC reconciliation, current screenshots, API36 replacement and QA | Current video, FGS, reviewer access, provider/type mapping, runtime tracking QA and replacement | Reviewer access, provider/type mapping, catalogue/rating QA and replacement |
| 30 New AAB? | YES for native permissions and current production update | YES for native permissions/background behavior | YES for native permissions |

Government apps and Advertising ID declarations are No on all3; no source evidence of government affiliation or advertising-ID use found. Ads can exist without using an advertising ID. No package, signing key, pricing or country setting was changed.

## Exact Console change ledger

| App / section | Before → saved state | Evidence/reason | Review / binary |
|---|---|---|---|
| Customer Financial | Payments/wallet + BNPL → payments/wallet only | Explicit owner confirmation no financing | Appears under What you have told us; not a separate queued publish item. No binary needed for declaration |
| Customer Ads | No → Yes | Sponsored VENDOR/EXTERNAL home campaigns in94c66e22 recorded for active closed16 |1 queued change, submit disabled; no binary needed for declaration |
| Captain Ads | Yes → No | No advertising feature/SDK found in audited Captain implementation | Queued review; no binary needed for declaration |
| Captain IARC | Older rating → new questionnaire with interaction/location answers | Actual text/voice and shared operational location, no verified block/report/moderation | Queued review; no binary solely for questionnaire |
| Customer Data safety | No collection → saved partial draft Yes +19 categories | Account/service/payment/location/SDK source inventory | NOT finalized or submitted; missing handling/sharing decisions |
| Captain Data safety | Stored fields marked ephemeral → retained; corrected purposes for profile/location/messages/docs | Backend persistence and feature use | Partial draft only; provider-dependent answers NOT CONFIRMED |
| Partner Data safety | Stored profile fields marked ephemeral → retained/functionality | Backend persistence and feature use | Partial draft only; provider-dependent answers NOT CONFIRMED |

Final Publishing overview: Customer1 Ads change (disabled), financial update separately acknowledged; Captain2 changes (Ads and Content Rating), disabled by incomplete FGS; existing background-location declaration appears under What you have told us, but its video is unusable. Partner1 **pre-existing** production country change: add Nigeria, affects other tracks. No Data safety draft is presented as a completed submission. Customer managed publishing ON; Captain/Partner OFF. No Send/Submit for review or Publish button was pressed. No new release or rollout occurred.

## Priorities and decision gates

- **P0:** No confirmed compromise, active exploit or mandatory takedown established. This does not certify continued publication as safe.
- **P1:** False/incomplete Data safety; unusable/unverified reviewer access; Customer/Captain FGS blockers; Captain missing current video/disclosure/runtime evidence; production Customer update target; native permissions; unverified controller/provider terms. Do not claim compliant or submit guessed answers.
- **P2:** Stale/misleading listing screenshots, rating/UGC and catalogue controls needing reconciliation; privacy copy and ownership awaiting deployment after review; remaining dependency findings; full device/picker/background/deletion and pre-launch validation absent.
- **P3:** Play Integrity integration and R8/DEX optimization recommendations; adequate vitals sample and periodic review-account checks.
- **FUTURE:** Track the Console/official precise-location declaration readiness (announced Nov2026, enforcement Jan2027), future API target announcements and visible16KB technical deadline. Existing active artifacts already show16KB support. Future requirements are not current violations. Recheck published dates at release time.

Owner confirmed no account/contract handoff exists. See `missing-compliance-evidence-2026-09-27.md` for exact private record structures, provider-by-provider document requirements and verification gates. Public processor wording does not establish a blanket Google Play sharing exception. Every unresolved provider/data-type answer remains NOT CONFIRMED. No dedicated accounts were created or authenticated; no secrets were recorded in these documents.

**Remaining independent audit work is explicitly open:** final Customer/Partner IARC question reconciliation against verified operational content/moderation, complete19-type Customer handling plus Captain/Partner category/auth corrections, and device/runtime testing. These must be completed alongside the missing evidence before calling the audit verified. This report records the work and blockers; it does not hide those gaps under a completion badge.

## Local implementation and validation

- All3 native configs block unnecessary storage/media-projection/overlay permissions. Occasional uploads use selected-media pickers; Captain camera remains explicitly requested only for camera choice.
- Captain tracking requires prominent disclosure before background permission and accepted/in-progress work; serialized lifecycle and cancellation; stops when server no longer confirms active work. Fail-closed network behavior needs device/operational validation because tracking can stop during connectivity loss.
- Shared owner/footer/email branding uses Zamkah Technologies Limited. No assumed Express Limited operating/controller/contracting role. Website terms/deletion/contact had no direct Express reference but inherited footer; privacy copy expanded. Public site remains unchanged until separately deployed.
- Next.js15.5.26 across website/admin/vendor; tar7.5.22. Full production audit39 findings:0critical,16high,22moderate,1low. Critical findings removed locally; remaining high findings are not waived and require package/applicability triage before deployment. No forced major Expo upgrade.
- PASS: all3 mobile typechecks and regression chains; targeted Captain disclosure/denial/assignment-end/start-cancellation/server-failure regressions; Expo Doctor18/18 all3; Expo config introspection; Android JavaScript exports all3 (not AABs).
- PASS: website typecheck/regression/production-copy and12-route checks; Next15.5.26 production build17pages; backend/admin/vendor typechecks; deletion tests3/3 with mocks; local rendered privacy owner wording/links inspected; git diff whitespace check.
- NOT RUN/NOT VERIFIED: replacement native AAB merge, clean-device runtime QA, reviewer authentication, live account deletion, actual provider-contract applicability, pre-launch runtime report. Existing artifact compatibility is not proof the replacement artifact will pass.

Source changes require a later push/deployment/replacement build to affect users: **push required YES, not performed; new AAB YES all3, not built/submitted; OTA NO.** Local commit hash is recorded in the final handoff after commit. Commit inventory is authoritative for files changed.

## Can all3 safely remain published?

**Not verified.** Customer is published with unresolved declaration and evidence risks. Captain/Partner are testing releases, not active production releases. Their Console No issues found does not resolve the audited gaps. No app was unpublished, and this report is not a recommendation to fabricate declarations or automatically remove an app. Resolve gates before additional release/review submission; the owner must decide publication risk with appropriate legal/operations input.

## Evidence

Official policy references: Google Play Data safety https://support.google.com/googleplay/android-developer/answer/10787469 ; FGS https://support.google.com/googleplay/android-developer/answer/13392821 ; background location https://support.google.com/googleplay/android-developer/answer/9799150 ; target API https://support.google.com/googleplay/android-developer/answer/11926878 ; deletion https://support.google.com/googleplay/android-developer/answer/13327111 ; financial https://support.google.com/googleplay/android-developer/answer/13849271 ; Ads https://support.google.com/googleplay/android-developer/answer/9815348 ; photo/video https://support.google.com/googleplay/android-developer/answer/14115180 . Provider source links and safe Render configuration evidence accompany this report.

Automatic approval review blocked revealing the masked Render RIDE_CALL_PROVIDER field because the owner prohibited exposure of secret environment values. No bypass was attempted; the unresolved feature activation is recorded instead. This did not block the safe project/service configuration inspection.

Additional saved Captain and Partner draft correction: OAuth checked to unchecked; no OAuth account-creation flow found. Save confirmation verified. Other account-creation and partial-data-deletion claims remain flagged until full supported onboarding/deletion paths are reconciled. Provider sharing answers were not changed to No.
