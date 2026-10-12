# KariGO Customer Apple identity and TestFlight gate — 12 October 2026

## Authorized identity correction

Foundation commit 5d9551f1856cb5237a0c9d1d107e9b769a2e7745 was pushed normally to codex/customer-ios-foundation. Vercel Preview Comments and the three Vercel project status checks all succeeded. No main merge/push was performed.

Apple rejected com.karigo.customer as globally unavailable. It was never registered in Zamkah's team; no record was created by that rejected attempt. The owner explicitly directed use of ng.com.karigo.customer instead, with no further identifier guesses.

The new identifier was accepted and appears in the registered identifier list and persisted edit page:

| Item | Verified value |
| --- | --- |
| Team | 6Y4WC7MQB6 — Zamkah Technologies Limited |
| Description | KariGO Customer |
| Explicit Bundle ID | ng.com.karigo.customer |
| Apple identifier resource ID | MG4WJY93K6 |
| Resource URL | https://developer.apple.com/account/resources/identifiers/bundleId/edit/MG4WJY93K6 |
| User-enabled capability | Push Notifications |
| Other capabilities | Associated Domains, Sign in with Apple, HealthKit and unrelated selectable capabilities remain off. Apple automatically checks and disables the In-App Purchase checkbox for App IDs; no IAP product, purchase entitlement or IAP implementation was added. |
| Android | com.karigo.customer, code 19; unchanged |
| iOS version/runtime | 1.1.1 / 1.1.1; unchanged |
| Staging iOS ID | com.karigo.customer.staging; unchanged, not registered by this task |

No build existed for the old iOS ID, so no released iOS binary migration is involved. Retain Android identity. EAS uses bundle ID from app.config.ts, now explicitly associated with Apple Team 6Y4WC7MQB6. Production APNs entitlement is production; staging remains development.

## App Store Connect

Created one iOS app record under the same organization:

- Name/developer name: KariGO / Zamkah Technologies Limited.
- App ID: 6822071362.
- Bundle ID: ng.com.karigo.customer.
- SKU: karigo-customer-ios.
- Primary language: English (U.K.).
- State: Apple's automatically created 1.0 Prepare for Submission skeleton. This is not a public release or review submission, and it does not change the app's 1.1.1 build version. No extra public listing metadata was saved. Align the future release version at the separately approved submission gate.
- Persisted App Information page verifies ID, SKU, Bundle ID and language.

## Signing and APNs gate

Existing certificate is present in EAS account storage: 9Y29K4F8P5, Team 6Y4WC7MQB6, serial 47E26B4C2EF8102E3B6E8D1209AA5984, expiry October 11, 2027 at 22:14:34 WAT, already used by @zamkah/tradia-v2-mobile. Apple portal inventory also showed a valid iOS Distribution certificate. No replacement certificate was created; reuse is preferred. Selecting reuse reached provisioning setup, which requires Apple authentication. A displayed "Creating provisioning profile" line before authentication is not evidence that a profile was created.

The owner explicitly approved scoped certificate reuse, one Customer App Store provisioning profile and reuse/creation of one APNs key with EAS binding. A visible PowerShell session was opened for manual Apple authentication and official eas credentials setup. The owner completed it without a build. Read-only EAS verification now confirms @zamkah/karigo-customer / ng.com.karigo.customer / Team 6Y4WC7MQB6 has the existing certificate serial above, App Store profile FJB4TSH526 active and expiring October 11, 2027 at 22:14:34 WAT, and Push Key NQ8X8SYFH8. Apple portal independently shows that Customer App Store profile as Active and exactly one APNs key: Expo Push Notifications Key 20261012212903, Team Scoped (All topics), Sandbox & Production. The Tradia profile remains present. No replacement certificate, duplicate profile/key or unrelated binding was created by this task. No password, 2FA code, P12/P8 content or secret was captured in automation output. Native codesigning itself remains a first-build gate.

## Approved iOS AdMob preparation

Owner separately approved exactly one unpublished iOS AdMob app and exactly one Native ad unit; no Android AdMob change and no production ad requests. Creation succeeded:

- Publisher: pub-8797316301984037.
- iOS app: KariGO, console resource 8850716285.
- iOS App ID: ca-app-pub-8797316301984037~8850716285.
- Native unit: Customer Home Native Fallback iOS.
- Native unit ID: ca-app-pub-8797316301984037/1519021173.
- Partner bidding not enabled. No banner, interstitial, rewarded or App Open unit is used by current Customer code; none created.
- iOS app is not linked to a publicly available store listing; final AdMob app readiness/store verification remains a later gate. No review/ads activation was forced.

Actual IDs are wired into the Expo plugin and platform-specific Native selection. iOS QA uses the library's official iOS generic test Native unit ca-app-pub-3940256099942544/3986624511; Android IDs remain unchanged. No test-device identifier was added to production.

EXPO_PUBLIC_ADMOB_IOS_PRODUCTION_READY=false is explicit in the iOS production profile. The iOS consent and initialization code is independently gated: Android's existing readiness flag cannot start iOS UMP or Ads initialization. Invalid/missing iOS App IDs fail readiness. Ad requests remain subject to first-party-direct-first and consent checks. No ads were requested or viewed during this task; no OTA or binary was published.

## ATT and consent determination

Current contained iOS production behavior does not request ads, does not request ATT and does not authorize IDFA access. ATT is not added just because the framework exists. Existing Native requests specify requestNonPersonalizedAdsOnly=true; iOS native bridge converts this to npa=1. UMP is installed (declared iOS pod version 3.0.0) and gatherConsent requests consent info then shows a required form. Google Mobile Ads declared iOS pod version is 12.11.0. These are podspec declarations, not a resolved archive.

NO ATT permission is required for the present disabled-ad release policy. Future ad activation remains blocked pending an approved iOS UMP configuration, actual SDK/device privacy validation and a tracking determination. Non-personalized ads alone do not prove absence of Apple's tracking: Google documents app/developer device identifiers and a default publisher first-party ID. No user ID or publisherProvidedId is passed by KariGO. Do not claim a final tracking=false disclosure for future enabled advertising without resolving that evidence. No privacy message, ATT explainer, tracking authorization, SKAdNetwork advertising attribution configuration or production readiness flag was enabled here.

## Final iOS permission configuration

- Foreground location: KariGO uses your location only when you choose to detect a delivery or service address.
- Photo library: KariGO uses photo library access only when you choose a customer profile photo.
- Microphone: KariGO uses your microphone only when you make or receive an in-app Ride call.
- Face ID: KariGO uses Face ID only when you enable biometric sign-in.
- Notifications: Expo permission request and APNs production entitlement; native/device delivery untested until a binary exists.
- Camera, always-location, contacts, tracking description and background modes remain absent. Calls are audio-only and not recorded.

## Account deletion review

Discoverable route: Profile → Privacy & security → Delete account. The app posts accountType CUSTOMER and confirmation DELETE to the production API through the existing authenticated client; it does not require the customer to contact support to initiate the request. External page https://karigo.com.ng/account-deletion returned 200. A read-only unauthenticated production GET /api/v1/account-deletion returned 401, confirming the route is protected. No deletion request or account mutation was submitted.

Eight isolated AccountDeletionService tests passed. However, the inspected Customer completion path sets accountStatus DEACTIVATED and deletedAt, without demonstrated personal-data anonymization/erasure. App Review compliance is NOT fully passed. Establish actual deletion/retention execution and communicate its timeframe before review. There is no iOS device binary with which to prove the complete UI→production request path yet. Do not delete the owner's account or broaden this task into backend changes.

## Draft App Privacy matrix — not submitted

This is a code/provider evidence inventory. Linked means retained account/device linkage; not merely Google Play's shared/collected label. Final binary report and conditional SDK rows remain explicit open evidence items.

| Apple category | Collected? | Linked? | Tracking? | Evidenced purpose / caveat |
| --- | --- | --- | --- | --- |
| Name, phone, email, physical address | YES where supplied | YES | NO in first-party flow | Account, authentication/OTP, service/delivery, support; App Functionality |
| User ID | YES | YES | NO in first-party flow | Account/session, order linkage; App Functionality |
| Device ID | YES for push/install and retained SDK session metadata | YES to account/device where mapped | First-party NO; future advertising unresolved | Notifications, reliability; App Functionality/Analytics as evidenced |
| Precise location | YES for stored service/pickup/address coordinates | YES | NO in first-party flow | App Functionality; optional foreground detection does not erase retained addresses |
| Coarse location | Provider IP/geolocation and potentially SDK-derived | Device linkage/provider-specific | Future advertising unresolved | Service routing/reliability; advertising/analytics conditional on enabled SDK |
| Payment Info / Other Financial Info | Wallet/reference/status YES; hosted raw payment details require final boundary review | YES | NO in first-party flow | Payments, wallet accounting, fraud controls; App Functionality |
| Purchase History | YES | YES | NO in first-party flow | Orders/Rides/live Airtime and Abuja utility receipts; App Functionality |
| Photos | YES when uploaded | YES | NO | Optional profile photo; App Functionality |
| Customer Support / Other User Content | YES | YES | NO | Support/request text and retained Ride messages; App Functionality |
| Audio Data | Not retained as a recording; real-time request processing only | No stored audio; call metadata is linked | NO first-party tracking | Assess Apple's real-time collection exclusion; do not manufacture recordings |
| Advertising Data | First-party impressions/clicks YES; iOS AdMob requests currently disabled | YES/device-specific | First-party NO; future AdMob unresolved | Developer advertising/analytics or third-party advertising only where evidenced |
| Product Interaction | YES for enabled operational/ad events | YES | NO first-party; future SDK unresolved | App Functionality/Analytics; no website GA4 assumption for mobile |
| Performance / Other Diagnostics | Retained provider reliability/network metadata YES where documented | Device/session linkage varies | Future SDK advertising unresolved | App Functionality/Analytics; validate actual iOS archive |
| Crash Data | GMA documentation says non-user-related crash logs may be collected when active; actual iOS telemetry unverified | Generally not user-related per GMA; final SDK evidence needed | Not assumed | Reliability/Analytics; do not invent a direct crash SDK |

Inventory covers Termii, Resend, Flutterwave, Paybeta, Expo Push/EAS Update, Agora, storage/hosting and map providers. Airtime and Abuja prepaid Electricity remain live; Data/Cable remain unavailable. Current Apple privacy answers were not saved or submitted. This draft is complete as an inventory of knowns/open decisions, not as a final verified label set.

## Pinned build toolchain and native preflight

customer-production-ios is store/Release, production environment, channel customer-production, runtime 1.1.1, API https://karigo-8htn.onrender.com/api/v1. Pin image macos-sequoia-15.6-xcode-26.2, documented by Expo as Xcode 26.2 (17C52), macOS 15.6.1 and CocoaPods 1.16.2. This meets Apple's current Xcode 26+/iOS 26+ upload requirement. Override Node to 22.20.0 (official LTS release) to satisfy repository's Node 22 engine, rather than the image's Node 20 default. No latest alias or SDK upgrade.

PASS: config introspection, actual GADApplicationIdentifier, production aps entitlement, retained four usage descriptions, missing camera/always-location/ATT assertions, Android generated configuration and mod-results equality; typecheck/full Customer regressions; dedicated iOS Ads platform/containment regression; Expo Doctor 18/18; iOS Hermes export; EAS config resolution; local manifest XML parsing.

Native compile/Pods/signatures are NOT proved. Windows prebuild explicitly refuses iOS generation. Existing WSL Ubuntu has no Linux Node/Ruby/CocoaPods; no tooling was installed. Final Xcode/pod resolution, Hermes binary/SDK signatures, aggregated manifests, private-key signing and on-device push/microphone/biometrics require the separately approved first native build. No native packages or versions changed. No build/upload was created.

## Metadata, screenshots and reviewer plan

Draft name KariGO; subtitle Rides, orders and utilities; keywords rides,delivery,orders,shopping,airtime,electricity,Kano,Abuja; copyright 2026 Zamkah Technologies Limited. Canonical support https://karigo.com.ng/contact, privacy https://karigo.com.ng/privacy, terms https://karigo.com.ng/terms and marketing https://karigo.com.ng. Description and TestFlight/review drafts are in the foundation inventory; they must describe only supported public services and not promise public Cable/Data.

Secure reviewer plan: owner verifies a dedicated reusable Customer account on the first iOS build, with repeat phone/password login and no OTP/human intervention; credentials entered only in Apple secure review fields. No reviewer password/phone entered in source. No real purchase or live dispatch is required for this preparation. Beta contact details remain to be finalized privately.

Capture screenshots from the first real iPhone build at 1179×2556 or 1206×2622: Home/readiness, Ride request/route confirmation, local seller/order workflow, Orders→Utilities history with sanitized receipts, Wallet using test data, Profile/privacy/deletion entry. No real phone, address, token, IUC, meter, transaction/payment secret or personal photo. No fabricated screenshots. iPhone-only configuration: no iPad screenshots. Existing icon is 1024×1024 RGB without alpha.

## Remaining gates

Signing/profile/APNs binding is verified. READY TO REQUEST APPROVAL FOR EXACTLY ONE IOS STORE BUILD using customer-production-ios, with iOS production ads disabled. Native compilation is a first-build validation gate, not a claimed pass. Later App Review requires account-deletion compliance evidence, approved reviewer access, actual screenshots/privacy report and final metadata/ratings. Future ad activation is separate and remains disabled. No build or upload is authorized by this closeout.

Candidate build command (NOT executed): npx --yes eas-cli@24.10.0 build --platform ios --profile customer-production-ios. Do not add --auto-submit. Upload/TestFlight distribution remains a separate action.

No Android production behavior, utility readiness, GOtv, Cable/Data availability, other DisCos, backend/database, provider credentials or public release was changed. No push notification or paid transaction was sent.

## Sources

- https://docs.expo.dev/build-reference/infrastructure/
- https://developer.apple.com/news/upcoming-requirements/?id=04282026a
- https://nodejs.org/en/blog/release/v22.20.0
- https://developers.google.com/admob/ios/privacy/data-disclosure
- https://developers.google.com/admob/ios/privacy/strategies
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
