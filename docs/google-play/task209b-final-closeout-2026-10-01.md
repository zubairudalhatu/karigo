# Task 209B final privacy, website and Data Safety close-out — 1 October 2026

Status: **B — PARTIAL: specific provider-sharing answers remain unsupported.** This is a preparation record. Google Play was inspected read-only and was not changed or submitted.

## Owner/legal retention decision table

No Nigerian statutory duration is asserted. Owner/legal must approve the purpose, minimum fields, start event, duration, disposal/anonymisation method and exception handling for each `DECIDE` row.

| Record group | Current implementation | Delete possible? | Anonymise possible? | Proposed rationale / required decision | Public-copy and Play effect |
| --- | --- | --- | --- | --- | --- |
| Identity/profile | Account deactivated/soft-deleted; identity remains linked | Partial | Technically feasible with relationship/collision design | **DECIDE:** delete vs irreversible pseudonymisation; retain minimum fraud/dispute identity only if legally supported | Policy says deactivation and qualified retention; collected/retained while account operates |
| Addresses | Relational address/history can remain | Yes for standalone rows; linked history needs design | Yes | **DECIDE:** remove saved addresses; minimise coordinates in retained fulfilment evidence | Policy must name retained service history; Customer address/location stays collected |
| Orders | Retained | Technically possible but destructive to finance/disputes | Yes, subject to reconciliation links | **DECIDE:** finance, fulfilment and dispute basis and period | Purchase history remains collected/retained |
| Ride/Delivery traces | Trips/status/location evidence retained | Technically possible by scoped deletion | Yes with utility/safety trade-off | **LEGAL:** safety/dispute purpose, coordinate minimisation and period | Captain operational activity and location retained; Customer history retained |
| Financial/reconciliation | Allowlisted references, amount, currency, status and timestamps retained; legacy payload cleanup complete | Payload deletion possible; transaction deletion would break reconciliation | Limited | **LEGAL/FINANCE:** minimum ledger fields and period | Other financial info and purchase history remain; Customer User payment info is NO |
| Chats/support/call sessions | Messages and call-session metadata can remain; audio is not recorded by KariGO code | Yes where unlinked; linked case history needs rules | Yes | **DECIDE:** support/dispute exceptions; remove message content when no longer needed | Other in-app messages conditional; do not declare email/SMS inbox content |
| Captain application documents | Eligible unattached objects physically deleted; attached/approved evidence retained | Yes through provider-confirmed delete | Metadata can be minimised; file cannot be meaningfully anonymised | **LEGAL:** active/approved evidence purpose and review/expiry period | Files/documents collected, retained, GCS transfer not shared under exception |
| Partner historical/replacement evidence | Seven historical audit rows retained; old objects absent; replacements use private GCS | Yes for eligible replacement object | Audit metadata can be minimised | **LEGAL:** historical proof fields, approved replacement period and review | Files/documents collected; missing old files are not described as retained |
| Notifications/device tokens | Refresh tokens revoked; full notification/device-token deletion not proven for every path | Yes | Not useful | **DECIDE/IMPLEMENT:** delete tokens and message bodies on completed deletion unless a security hold applies | Device IDs collected while active; deletion disclosure remains qualified |
| Admin/vendor audit | Retained | Yes but may impair accountability | Yes/minimise actor reference | **LEGAL/SECURITY:** minimum event fields and period | Security/compliance purpose; retained |
| Login activity | Retained | Yes | Yes/IP truncation possible | **LEGAL/SECURITY:** threat-detection window and restricted access | Security purpose; retained |
| OTP verification | Verification records may remain; no universal purge proved | Yes | Yes | **DECIDE/IMPLEMENT:** short-lived verification evidence plus abuse exception | Phone/auth purpose only; no OTP value in public copy |
| Security/audit records | Retained | Yes after approved window | Yes | **LEGAL/SECURITY:** minimum incident/account-deletion proof and period | Security/compliance purpose; retained |

## Exact public-copy result

- `/privacy`: identifies Zamkah Technologies Limited as the confirmed responsible organisation without treating footer branding as controller evidence; lists actual categories; explains hosted Customer checkout and minimized reconciliation evidence; documents active-work location, private GCS, seven-day soft deletion, Partner reacquisition, provider roles and qualified retention.
- `/account-deletion`: states deactivation/session revocation and provider-confirmed deletion of eligible objects; does not promise broad anonymisation or immediate irreversible provider erasure; describes blockers, retained groups and pending duration decisions.
- `/terms`: adds hosted checkout, authenticated private onboarding evidence, reacquisition and secure Careers applications.
- In-app deletion copy should use: **“Deleting an account deactivates the selected KariGO access, revokes active sessions and deletes eligible unattached private documents after storage confirmation. Some order, financial, approved onboarding, security and audit records may be retained for a defined legal, finance, safety or compliance reason. Provider soft-delete or protected backup copies may remain for a limited period.”**

## Final evidence-supported Data Safety answers

All listed data is retained unless marked optional/conditional; it is not ephemeral. Core account/fulfilment fields are required for the feature. Profile images, optional email and user-selected uploads are optional. Purposes are limited to app functionality, account management, developer communications, fraud prevention/security/compliance and reliability/diagnostics where evidenced.

### Customer

- **User payment info: NO.** Hosted Flutterwave checkout receives payment credentials. KariGO has no raw Customer card/bank input, new persistence is allowlisted, and the 22-record production cleanup left 12 compliant minimized payloads plus 10 JSON-null/missing payloads with zero eligible payloads.
- **Purchase history: YES.** Orders, Rides, receipts and transaction events; functionality, account management and fraud/security.
- **Other financial info: YES.** Wallet ledger, amount/currency, references, status, refund/reconciliation timestamps; functionality and fraud/security.
- Name, phone, user ID and address: YES; account/functionality. Optional email/profile photo when supplied.
- Approximate/precise foreground location: YES when the user invokes address, pickup, map or Ride features; functionality. No background location.
- Other in-app messages: YES when chat/support is used; functionality and support communications. Email/SMS inbox content: NO.
- App interactions/user-generated content/device IDs/diagnostics: YES to the extent in the production session, push, Maps and update paths; functionality, security and diagnostics.
- Sharing: Google Maps location/search/route/identifier/diagnostic fields **SHARED** for functionality and diagnostics. Assigned fulfilment-recipient transfers use the user-action exception where the user initiates the service. Render/Resend applicable payloads and GCS private objects use supported service-provider treatment. Flutterwave, Expo/FCM and conditional Agora sharing remain **NOT CONFIRMED** per data type.

### Captain

- Name, optional email, phone and user ID: YES; account/functionality/security.
- Approximate, precise and background location: YES while available/assigned and during accepted active work; functionality, navigation, safety/security. Retained operational traces are not ephemeral. Maps fields are SHARED.
- Ride/Delivery assignments, status, timing, chat and call-session activity: YES; functionality/security.
- Earnings, commission and payment/reconciliation references: YES; functionality/security.
- Identity, vehicle and application files: YES; onboarding/account/security. Private GCS transfer is **NOT SHARED** under the accepted Zamkah DPA/service-provider exception.
- Device/push identifiers and diagnostics: YES where generated by session, Expo/FCM, Maps and runtime reliability paths.
- Other in-app messages: YES when Ride/support chat is used. Email/SMS inbox content: NO.
- Voice/audio: conditional YES only when the production Agora RTC call feature is active; stream is transient and KariGO stores session metadata, not audio. Activation/account/recording evidence remains NOT CONFIRMED, so do not add it until confirmed.

### Partner

- Business/contact identity, address and user ID: YES; required for account/onboarding/functionality.
- Device ID and diagnostics: YES for session/update runtime where evidenced; Expo sharing unresolved.
- Purchase/order activity and product/service/user-generated content: YES; functionality/account management.
- Payout bank-account information, settlements and payment references: YES; Partner supplies raw payout account data to KariGO; functionality/fraud-security.
- Files/documents: YES; private onboarding/commercial evidence, retained for onboarding/security. GCS transfer is **NOT SHARED** under the service-provider exception.
- Photos/videos: YES when catalogue/logo/cover content is supplied; optional and intended for catalogue publication.
- Other in-app/support messages: conditional YES; email/SMS inbox content NO.
- Device approximate/precise location: **NO**; no production permission or collection path. Business address remains Personal info > Address.

## Current Play → final difference report

| App | Current Play answer | Final answer | Action |
| --- | --- | --- | --- |
| Customer | User payment info selected in persisted Data-types draft; Step 4 unfinished | Not collected | **REMOVE** |
| Customer | Purchase history selected; handling unfinished | Collected, retained, required for transaction features; functionality/account/security | **CHANGE/COMPLETE** |
| Customer | Other financial info selected; handling unfinished | Collected, retained, required for wallet/payment features; functionality/security | **CHANGE/COMPLETE** |
| Customer | Partial category draft; handling incomplete | Complete identity/address/location/messages/activity/device/diagnostic entries above | **CHANGE/COMPLETE** |
| Customer | Provider sharing unfinished | Maps shared; named unresolved providers remain unresolved until supportable | **CHANGE where confirmed** |
| Captain | Persisted profile/location/messages/doc fields previously marked ephemeral/incomplete | Retained, required or conditional as above; functionality/account/security/communications/diagnostics | **CHANGE** |
| Captain | User IDs, device IDs, financial references, operational activity and diagnostics incomplete/missing | Collected and retained | **ADD** |
| Captain | Email/SMS content selected without evidence | Not collected | **REMOVE** |
| Captain | GCS sharing unresolved in old worksheet | Not shared under service-provider exception | **CHANGE** |
| Captain | Voice/audio uncertain | Add only after actual production activation is confirmed | **KEEP UNRESOLVED** |
| Partner | Device location selected/possible in old form | Not collected | **REMOVE** |
| Partner | User IDs, device IDs, orders, payout references, files and app/user content incomplete/missing | Collected and retained as above | **ADD/CHANGE** |
| Partner | Email/SMS content selected without evidence | Not collected | **REMOVE** |
| Partner | Private storage planned/unresolved in old worksheet | Live verified private GCS; not shared under exception | **CHANGE** |
| Partner | Historical files implied available | Seven objects absent; audit history retained; replacements reacquired privately | **CHANGE wording/handling** |

No unsupported Shared or Not shared value should be selected. Play's form requires handling records to be completed before the final submission; unresolved provider rows therefore prevent final submission today.

## Provider evidence closure

| Provider/flow | Status | Play consequence |
| --- | --- | --- |
| Render application hosting | CONFIRMED | Service-provider treatment for applicable app payloads |
| Resend transactional email | CONFIRMED for applicable payload | Service-provider treatment; no email inbox collection |
| Google Cloud Storage private Captain/Partner documents | CONFIRMED | Collected, retained, not shared under exception; seven-day soft delete disclosed |
| Google Maps active SDK/API requests | CONFIRMED | Shared for relevant location/search/activity/identifier/diagnostic fields |
| Flutterwave hosted checkout and KariGO persistence | CONFIRMED for data minimisation; provider independent-use/contract classification NOT CONFIRMED | Customer User payment info NO; sharing answer remains unresolved by data type |
| Expo/EAS/FCM push and telemetry | NOT CONFIRMED | Device-ID/diagnostic sharing remains unresolved |
| Agora RTC | NOT CONFIRMED for current activation/account/recording state | Voice/audio remains conditional; do not declare until activation confirmed |
| Termii / Utilities | NOT CONFIRMED where production activation/data flow is not evidenced | Do not add a category solely from configured capability |

## Read-only Play App content review — 1 October 2026

- Customer: Need attention = none; 10 actioned declarations. Sign-in details, Ads and Financial features are staged Ready to send for review. Data Safety remains last edited 23 July. No foreground-service declaration is present.
- Captain: Need attention = none; 12 actioned declarations. Foreground service permissions (edited 30 September), Location permissions, Sign-in details, Ads and Content ratings are staged Ready to send for review. FGS and location declarations remain intact; no media-projection item appeared.
- Partner: Need attention = none; 10 actioned declarations. Sign-in details is staged Ready to send for review. No unexpected foreground/location declaration appeared.
- Account deletion is supplied through the public privacy/account-deletion URL rather than a separate visible App-content card in these overviews.
- Google Play modified: **NO**. Sent for review: **NO**.

## Website, Careers and Safety implementation

- Footer has the approved two-part corporate strip, only valid routes, official Google Play badge linked to `com.karigo.customer`, and an inactive iOS coming-soon treatment.
- Careers routes exist with an empty approved-vacancy registry, so no vacancy is fabricated. The page defines the seven-stage lightweight workflow and secure private/authenticated application-storage requirements. Activating a vacancy still requires approved job content, an implemented form endpoint/private storage and an approved recruitment retention schedule.
- Safety covers only implemented operational, verification, location, privacy and reporting controls. It makes no SOS, insurance, emergency-dispatch, recording or 24/7 monitoring claim.

## Dependency advisories

The fresh root production-dependency audit on 1 October 2026 reports 23 aggregated dependency findings: 18 moderate and 5 high, with no critical finding. The five high dependency nodes are `prisma`, `@prisma/config`, `deepmerge-ts`, `image-size` and `postcss`. The Prisma/deepmerge findings affect migration/config tooling; `image-size` is reached through Expo/build tooling; and the PostCSS findings concern CSS/source-map processing during build. The audited website, payment, authentication and private-storage request paths do not accept attacker-supplied Prisma configuration, Expo image build inputs or CSS/source maps. The moderate set is primarily Expo/CLI/configuration, Swagger YAML, Next/PostCSS and Xcode/UUID tooling. No advisory is established as directly exploitable in the active production payment, authentication, storage or request path. Keep all 23 findings in the security-maintenance backlog and reassess during the planned framework/toolchain upgrades.

## Close-out gate

Technical website work can be committed locally after validation. Final Play submission remains blocked only by provider-sharing/activation facts that Play requires, and by owner/legal approval of retention durations/bases and the final public legal copy. No production, GCS, Git remote or Play mutation is authorized by this document.
