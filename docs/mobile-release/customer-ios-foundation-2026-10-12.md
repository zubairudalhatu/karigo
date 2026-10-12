# KariGO Customer iOS production foundation — 12 October 2026

Status: NOT READY TO CREATE A TESTFLIGHT BUILD. Local preparation only. No Apple registration, certificate/profile/key creation, build, upload, review submission, OTA or production change occurred.

This is the initial foundation snapshot. Later owner-approved identifier correction, Apple record creation and iOS advertising preparation supersede the relevant fields: see customer-ios-apple-setup-2026-10-12.md. Do not attempt registration of the globally unavailable com.karigo.customer identifier.

## Identity and configuration

Inspected source baseline: 63f17aa5998627b8b50d9effcad92fd4ab0a2fe7, with Customer code inherited from the existing release. Local foundation branch: codex/customer-ios-foundation.

| Item | Verified value |
| --- | --- |
| Expo project | @zamkah/karigo-customer |
| EAS project ID | 467aa2f6-22b1-4a81-a9d6-c38f3ebe191d |
| Display name | KariGO |
| Version/runtime | 1.1.1 / 1.1.1 (appVersion policy) |
| Android | com.karigo.customer / code 19; unchanged |
| Existing production iOS bundle ID | com.karigo.customer; retain this identifier |
| Staging bundle ID | com.karigo.customer.staging |
| iOS build number | Generated default 1; no prior EAS iOS builds returned |
| Framework | Expo 53 / React Native 0.79.6 / New Architecture / Hermes |
| Native project | No checked-in ios directory; managed config with prebuild/CNG |
| Deployment target | React Native 0.79 tooling requires iOS 15.1; native archive not generated/verified |
| Device family | iPhone only: Expo DeviceFamily resolves [1], supportsTablet false |
| Update URL | https://u.expo.dev/467aa2f6-22b1-4a81-a9d6-c38f3ebe191d |
| Production OTA strategy | customer-production, runtime 1.1.1; platform-specific updates |
| Production API | https://karigo-8htn.onrender.com/api/v1 |

Existing profiles remain customer-staging, customer-staging-ios-simulator, customer-admob-qa, customer-production and customer-play-internal. Added customer-production-ios extending customer-production: store distribution, production environment/channel, Release configuration, simulator false. No submit profile or auto-submit configured. Android profiles and generated Android config/mod results are unchanged. Do not publish an iOS OTA before a compatible iOS binary exists. Do not use the Android AdMob QA profile for iOS.

## Apple account inventory (read-only)

- Organization: Zamkah Technologies Limited. Team ID: 6Y4WC7MQB6.
- Apple Developer Program organization membership accessible; signed-in role Account Holder; renewal August 23, 2027.
- App Store Connect accessible for the same organization. Apps page says No Apps: Customer app record does not exist; app-name availability cannot be established without attempting creation.
- Identifiers page currently lists only com.tradiabusiness.mobile. com.karigo.customer is not registered in this team. No identifier was registered.
- One iOS Distribution certificate exists, expiring October 11, 2027. Its private key availability/reusability for KariGO in EAS is NOT established. No private key or certificate was opened/downloaded.
- Profiles page lists one Tradia Ad Hoc profile; no KariGO App Store provisioning profile exists.
- Keys page shows Getting Started with Keys with no existing keys; APNs key setup is absent. No key created/downloaded.
- Apple Developer agreements shown accepted. Free Apps Agreement Active, August 22, 2026–August 22, 2027. Paid Apps Agreement New/unsigned; do not accept it automatically. It is relevant if offering paid apps/IAP, not proof of a free-app upload blocker. EU trader declaration remains outstanding if EU distribution is intended. Do not expand distribution or complete compliance here.

Registration, App Store record, signing profile and APNs credential setup require separate owner authorization. Preserve unrelated Tradia assets.

## Capabilities and permission inventory

| Capability/permission | Actual Customer use and readiness |
| --- | --- |
| Push notifications | Expo notification permission/token registration supports IOS. Config produces aps-environment development as a prebuild template; store signing must resolve production APNs entitlement. Bundle Push capability and APNs-to-EAS credential setup missing. No background remote-notification mode added without demonstrated need. |
| Foreground location | Address detection, map/pickup selection. Keep WhenInUse explanation. No Customer background location requests found. |
| Microphone | Agora audio-only Ride calls; keep explicit Ride-call usage description. iOS permission denial/allow behavior still needs device testing; current request helper explicitly handles Android and relies on native iOS behavior. No video or stored call recording. |
| Photos | Optional profile image library picker. Keep photo-library explanation; no camera-launch path found. |
| Biometrics | Optional local biometric sign-in. Replaced generic Face ID text with purpose-specific explanation. No biometric templates transmitted to KariGO. |
| Contacts | No contacts access or description found; do not add. |
| Camera | Unused auto-generated description removed locally using an iOS-only Info.plist mod. |
| Always/background location | Unused auto-generated Always and AlwaysAndWhenInUse descriptions removed locally. No UIBackgroundModes currently generated. |
| Sign in with Apple | Not currently required by observed first-party phone/password/OTP login; no social login found. Reassess if social login is added. |
| Associated domains | No configured associated domains; app uses karigo-customer URL scheme. Verify hosted payment return/deep-link on iOS before claiming a universal-link capability is needed. |
| ATT/tracking | No NSUserTrackingUsageDescription/ATT request found. UMP exists but is not blanket ATT authorization. Decide and validate the iOS SDK tracking/IDFA policy before enabling ads; do not add an invented tracking description. |

The iOS permission mod runs first in the plugin list so its final Info.plist cleanup occurs after plugin defaults. Generated Android manifest/config equality with baseline was asserted. No app JS changed.

## Material iOS AdMob blocker

react-native-google-mobile-ads is pinned 15.8.3. Its installed podspec requests Google Mobile Ads iOS 12.11.0 and UMP 3.0.0 (declared versions, not a resolved Podfile.lock). Config provides androidAppId only. Plugin warns: No iosAppId was provided; native SDK will crash on iOS without it. GADApplicationIdentifier is absent from generated plist. Shared consent code imports and initializes this SDK on iOS, and ad-unit selection contains Android-only production and generic test Native units.

Obtain the existing approved iOS AdMob App ID and iOS Native unit (or an explicitly approved iOS feature policy), implement platform-specific selection preserving Android, and verify iOS consent/ATT behavior. Do not reuse Android identifiers, invent IDs, create AdMob resources or silently disable functionality. SKAdNetwork configuration is absent and must be assessed against the chosen iOS advertising policy. This task does not modify AdMob or ad behavior.

## Privacy manifests and SDK supply chain

Inspected eight local PrivacyInfo.xcprivacy files: Expo Device, Constants, File System, Application, Notifications, React Native Maps (Apple Maps plus its Google Maps resource bundle) and React Native cxxreact. All eight parsed as valid plist XML. Presence in monorepo node_modules is not proof that each is packaged in the final app; iOS uses default Apple Maps unless Google provider support is intentionally added.

Observed required-reason categories: SystemBootTime (35F9.1), UserDefaults (CA92.1), FileTimestamp (including C617.1 and Expo file-access reasons), DiskSpace (E174.1/85F4.1). React Native privacy aggregation enabled in generated Podfile properties. No explicit app-level privacyManifests setting exists. Validate the aggregated app manifest/resource membership after CocoaPods; do not manufacture declarations from unrelated monorepo dependencies.

Agora declares AgoraVideo_Special_iOS 4.6.2.70 and AgoraIrisRTC_iOS2 4.6.2-build.1. Google Mobile Ads/UMP and Agora binary SDK manifests/signatures have not been fetched or verified. Hermes is on Apple's required SDK list; verify its packaged manifest and binary signature plus any listed transitive SDK (for example SDWebImage) in the actual resolved pods. No Podfile.lock exists, and Windows Expo explicitly skips iOS native generation. No missing/invalid final binary manifest can yet be conclusively diagnosed.

## App Privacy inventory — draft, not submitted

Use Apple's collection, linkage, purpose and tracking definitions, not Play collected/shared labels. Optional permission is not automatically optional disclosure. Known account/order data is linked to Customer identity unless an evidenced anonymization step says otherwise.

| Apple category candidate | Evidence/use; remaining declaration decision |
| --- | --- |
| Contact Info: name, phone, email, physical address | Account/profile, OTP, communications, service/delivery addresses; app functionality. Email optional in product but still assess collection. |
| Identifiers: User ID, Device ID | Account ID, Expo push/device/install identifiers, SDK metadata. Functionality/security; SDK analytics/advertising purposes require final iOS evidence. |
| Location: precise/coarse | Foreground address/pickup coordinates; map/provider/IP-derived coarse location must be mapped separately. No Customer background tracking claim. |
| Purchases: Purchase History | Orders, Ride and utility transactions; functionality/support and financial reconciliation. |
| Financial Info: Payment Info / Other Financial Info | Wallet balances, funding/payment references/status, receipts. Raw card/bank collection in hosted processor flows needs an Apple-specific final assessment; do not blindly copy Android User payment info answers or claim no collection. |
| User Content: Photos, Customer Support, Other User Content | Optional profile images, retained Ride chat/support messages and request text. No inbox email/SMS access or videos observed. |
| Audio Data | Agora real-time audio is not recorded. Apple's collection definition excludes processing limited to servicing the real-time request; assess retained SDK metadata separately. Do not declare stored call recordings. |
| Usage Data: Product Interaction / Advertising Data / Other Usage Data | First-party impressions/clicks, service activity, third-party native ads; functionality/analytics/advertising as evidenced. |
| Diagnostics: Crash / Performance / Other Diagnostic Data | Expo/Agora/AdMob network/device/reliability data; final SDK iOS disclosure review and linkage still pending. No analytics provider may be assumed from website GA4. |

Inventory prepared; final disclosure set is incomplete until iOS ads/tracking policy and actual packaged SDK privacy report are resolved. Include server-side providers: Flutterwave payment, Paybeta live Airtime/Abuja Electricity, Termii OTP, Resend communications, Render/Vercel/GCS infrastructure, Expo Push/EAS Update, Agora and map/search providers. Earlier September provider worksheet saying utilities inactive is superseded by current production state. Public Cable/Data remain unavailable; owner-only GOtv acceptance is not advertised as a public feature.

## Functional App Store compliance inventory

- Account creation: first-party phone/password and verification; no social login found.
- Deletion: Profile → Privacy & security → Delete account → type DELETE → request. Backend review, active obligations and legally retained records are disclosed. Confirm this completes real account/data deletion, with timeframe communicated, rather than indefinite deactivation/manual support-only handling, before App Review.
- Marketplace/Ride/delivery payments: consumption outside app; describe accurate physical-service purpose and hosted payment/wallet flows. Do not claim an App Store exemption for unimplemented digital goods. No IAP/Apple Pay entitlement currently implemented. Cable is not publicly offered; keep that state unchanged.
- User-generated content: Ride-scoped chat retained 90 days, profile photos, support text. Confirm reporting/filtering/blocking and support escalation adequacy for Apple guideline 1.2; no explicit chat report/block control found in inspected screen.
- Push, foreground location, photo choice, biometrics and microphone need denial/grant testing on iPhone. Foreground Ride audio only; background audio/VoIP/CallKit behavior is not currently proven or declared.
- Reviewer credentials: existing dedicated Android reviewer process is documented, but no current iOS reusable account/no-OTP proof was established. Owner must provide verified credentials privately; do not fabricate or publish them. Review flows must not initiate real dispatch or financial transactions.

## Public URLs checked

All returned HTTP 200 on 12 October 2026:

- Privacy: https://karigo.com.ng/privacy
- Terms: https://karigo.com.ng/terms
- Support: https://karigo.com.ng/contact
- Account deletion information: https://karigo.com.ng/account-deletion

## Draft store and TestFlight metadata

Local drafts only; availability/name not reserved:

- Name: KariGO
- Subtitle: Rides, orders and utilities
- Keywords: rides,delivery,orders,shopping,airtime,electricity,Kano,Abuja
- Primary language proposal: English (UK); choose with owner when creating record.
- Category proposal: Maps & Navigation; finalize based on actual iOS experience.
- Support/Privacy/Terms: canonical URLs above.
- Marketing URL: https://karigo.com.ng
- Copyright: 2026 Zamkah Technologies Limited
- Promotional text draft: Manage local orders, Ride requests and supported utilities from your KariGO account. Availability depends on your service area.

Description draft:

KariGO brings supported local services into one account. Request a Ride, browse local sellers, manage delivery orders and addresses, and follow order or Ride activity. View wallet and transaction history, manage your profile and reach support.

Airtime and supported Abuja prepaid electricity are available where shown in the app. Service availability depends on location, approved providers and current operating status. Cable TV and Data are not currently available to the public.

Location is used when you choose address or pickup detection. Profile photos and in-app Ride audio calls are optional. Calls are not recorded. Account settings include privacy, terms, support and an account-deletion request.

TestFlight What to Test draft:

Verify first-party sign-in and session restoration, Home readiness labels, browse/orders/history, wallet display, legal/support/deletion navigation, foreground-location denial/grant, optional profile photo, biometric opt-in, Expo notifications, hosted-payment return and audio-call microphone behavior. Do not make live purchases or dispatch real Rides/orders. Cable/Data must remain unavailable. Report non-sensitive errors only.

Review instructions draft:

Use the dedicated review phone/password supplied privately after repeat no-OTP login is verified. Open Home, Orders and Profile. Profile → Privacy & security contains account controls. Use an approved controlled service-area/test context supplied by the owner. No account details are embedded in this document. Payment-dependent tests require separately authorized safe review arrangements.

Beta contact name/email/phone, credentials, SKU and App Store app ID remain to be finalized in secure Apple fields. No invented SKU or ASC app ID has been configured.

## Assets and ratings

- Existing icon apps/customer-app/assets/icon.png is 1024×1024 RGB PNG (no alpha channel). Final iOS AppIcon generation/appearance still needs native verification.
- No verified iPhone App Store screenshots found. Android screenshots are not iPhone evidence. Capture from a future compatible iOS build with sanitized account data; no screenshots generated here.
- Current Apple specification requires an iPhone Dynamic Island medium-display screenshot; accepted portrait sizes include 1179×2556 or 1206×2622. Use 1–10 PNG/JPEG screenshots showing Home, supported order/Ride workflows, transaction history and account controls. Recheck specifications at upload.
- Native iPad support is not enabled; iPad screenshots are not required for this configuration. Do not enable tablet support silently.
- Age-rating inputs to verify: advertising, user chat/UGC, marketplace services, any web access, and content controls. Do not invent a numerical rating. Promotional text/description drafted; screenshots and final age questionnaire remain pending.

## Validation and build gate

PASS: Customer typecheck; ten existing regression scripts (including AdMob 14 controls, readiness and utility receipt checks); Expo Doctor 18/18; iOS Metro/Hermes export with 1538 modules; Expo iOS introspection; permission removal assertions; generated Android config/manifest-mod equality; local profile inheritance and EAS remote profile resolution checks; eight plist XML parses; public legal URLs; diff check; secret scan of all four changed files (zero findings).

EAS resolved customer-production-ios to store distribution, customer-production channel, production environment and com.karigo.customer/version 1.1.1. Existing profile public environment values take precedence over matching EAS variables; API endpoint remains the production URL. No environment was edited. Final read-only backend check returned HTTP 200/status ok; readiness remains AIRTIME and ELECTRICITY AVAILABLE, DATA and CABLE_TV TEMPORARILY_UNAVAILABLE.

Initial export failed because sandbox denied Hermes output; rerun with authorized local filesystem access succeeded. Initial export output-directory error was corrected. Native prebuild in a disposable copy stopped because Windows is unsupported for iOS generation; no native compile or Pod install passed. EAS iOS build history returned zero entries. No EAS Build was started.

Before a TestFlight build:

1. Separately approve registering existing com.karigo.customer and creating its App Store Connect record.
2. Establish usable distribution signing/private-key custody and a Customer App Store profile; separately approve APNs setup and EAS binding.
3. Resolve iOS AdMob App ID/unit and platform-specific ads/consent/ATT policy without changing Android behavior.
4. Validate native prebuild/pods on macOS/Linux and compile using an EAS image satisfying Apple's current Xcode 26+/iOS 26+ SDK upload requirement. SDK 53 compatibility with that toolchain has not been compiled; do not silently upgrade Expo/RN.
5. Verify aggregated manifests/signatures and production iOS environment/required provider settings. No missing public identifier may be fabricated.
6. Approve exactly one build only after those blockers are resolved. TestFlight reviewer access/contact information and later iPhone QA/assets/privacy/deletion/UGC compliance remain distinct release gates.

Candidate command (NOT executed, not yet ready): npx --yes eas-cli@24.10.0 build --platform ios --profile customer-production-ios. No auto-submit, no --auto-submit.

## Primary references

- App Privacy definitions: https://developer.apple.com/app-store/app-privacy-details/
- Account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Review/payment/login/UGC guidelines: https://developer.apple.com/app-store/review/guidelines/uk/
- SDK manifests/signatures: https://developer.apple.com/support/third-party-SDK-requirements/
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Upload SDK requirement: https://developer.apple.com/news/upcoming-requirements/?id=04282026a
- Google iOS privacy strategy: https://developers.google.com/admob/ios/privacy/strategies
- Installed integration documentation: https://docs.page/invertase/react-native-google-mobile-ads

Android production, all utility readiness, other DisCos, GOtv, backend/database, credentials, Apple settings and public releases were not modified.
