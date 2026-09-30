# Three-app provider and Google Play Data safety reconciliation — 30 September 2026

Status: **PARTIAL — SPECIFIC OWNER DOCUMENTS STILL REQUIRED**. No Play form, CSV, release or declaration was changed. This document applies Google Play's current collection/sharing rules to the evidence in `provider-evidence-matrix-2026-09-30.md`.

## Decisions now supported

1. Render-hosted application payloads are collected but the Render hosting transfer qualifies for the service-provider exception under incorporated Terms/DPA. Separate Render service telemetry is not automatically exempt.
2. Resend message/recipient payloads qualify for the service-provider exception under its incorporated Terms/DPA. Separate account/service telemetry remains separate.
3. Google Maps flows are shared. Google and KariGO are controllers for Maps data, and Google receives/retains coordinates, search terms, IP/SDK/device/diagnostic/interaction data to provide and improve Google services.
4. Partner has no production device-location dependency, permission or API path. A typed business address is Personal info > Address, not device location.
5. No Customer or Captain input/code path collects raw card credentials or a customer's bank account. Flutterwave checkout is hosted. KariGO sends reference, amount, currency, name/email/phone and metadata.
6. `User payment info` still cannot be removed with full confidence because KariGO persists the complete Flutterwave verification/webhook provider response. A redacted production returned-field inventory must show that no response field maps to Play's financial-account/payment-instrument category; then storage should be allowlisted.
7. Captain RTC code disables recording and stores call metadata, not audio. Agora states production RTC audio is streamed and not stored, but production activation and account terms/settings are not confirmed.
8. Captain S3 storage remains unidentified and deletion currently marks database metadata only. Partner uploads use Render-local storage and may receive public URLs.

## Sharing outcomes by transfer

| Transfer | Outcome | Basis |
| --- | --- | --- |
| App → KariGO backend/Render application payload | **COLLECTED BUT NOT SHARED** for Render hosting | Render DPA processor scope and incorporated Terms; first-party KariGO remains responsible. |
| Backend → Resend email payload | **COLLECTED BUT NOT SHARED** | Resend DPA processor scope incorporated through Terms/account use. |
| Customer/Captain app or backend → Google Maps | **COLLECTED AND SHARED** | Controller-to-controller Maps terms and independent service-improvement use. |
| App → Expo Updates | **COLLECTED; sharing PARTIAL/NOT CONFIRMED** | Instruction-only User Data has processor terms; identifiable telemetry and controller use are not mapped sufficiently. |
| Customer/Captain push token/payload → Expo/FCM | **COLLECTED; sharing NOT CONFIRMED** | Processor terms exist, but sender activation, service telemetry and account terms/settings need confirmation. |
| Customer/Captain RTC → Agora | **NOT CONFIRMED activation** | Conditional processor evidence and non-recording implementation exist; account/config evidence is missing. |
| User-initiated hosted checkout → Flutterwave | **COLLECTED; may be exempt as user-initiated, not as service provider** | User reasonably requests payment; Flutterwave also acts independently for fraud/legal/improvement. Confirm exact product/consent and returned fields. |
| Captain document → S3-compatible storage | **NOT CONFIRMED** | Provider, region, agreement and lifecycle unknown. |
| Assigned party receives order/Ride identity, address or location | **COLLECTED; expected user-initiated transfer can be exempt from sharing** | Transfer is necessary to the specific order/Ride requested by the user. Validate disclosure/expectation per flow. |
| Termii, direct FCM, Utilities, Meta WhatsApp | **NOT CONFIRMED** | Implementation exists but production selector/activation is not evidenced. |

## Customer field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Name, phone, user ID | Yes; account-required and retained | Account, functionality, security | Render exempt; assigned fulfilment transfer may be user-initiated; provider-specific fields otherwise unresolved. |
| Email | Yes when supplied; optional and retained | Account and developer communications | Resend payload exempt; Render exempt. |
| Address | Yes for delivery/Ride; feature-required and retained | Fulfilment, account/support | Render exempt; assigned party may be user-initiated; Maps route/geocode **shared** where sent. |
| Profile image | Yes when chosen; optional and retained where upload succeeds | Profile functionality | Hosting path/access lifecycle must be confirmed; do not assume object-storage flow. |
| Approximate/precise location | Yes when user invokes address/Ride; foreground, feature-dependent; operational records retained | Functionality, safety, routing | Google Maps **shared**; assigned active Ride/Delivery transfer may be user-initiated; Render exempt. |
| User payment info | App/backend input: no raw card/bank credentials. Full provider response retention creates unresolved instrument-metadata scope. | Payment/finance/fraud | **Do not remove yet.** Complete redacted returned-field inventory and allowlist storage first. |
| Purchase history | Yes; transaction-required and retained | Fulfilment, finance, support/security | Render exempt; operational counterparties expected; payment flow assessment applies. |
| Other financial info | Yes: wallet ledger, amount, payment reference/status/refund/commission-related records; retained | Finance, functionality, fraud/security | Render exempt; Flutterwave user-initiated/independent-role analysis pending exact flow. |
| Other in-app messages | Yes when support/Ride chat used; retained | Functionality, support, safety/security | Render exempt; other Ride participant receives content as expected action. |
| Photos/files | Profile/evidence/content only when chosen; retained | Functionality/profile | Hosting/access lifecycle must be mapped. |
| Voice/audio | Only if Agora Ride calls are production-enabled; stream only, call metadata retained | Functionality | **NOT CONFIRMED** until activation/contract/settings evidence. |
| App interactions/searches/user content | Orders/Rides/support/reviews/actions retained; Maps searches/interactions and Expo update events transmitted | Functionality, security; provider analytics where documented | Maps portions **shared**; Expo telemetry unresolved; Render exempt. |
| Crash logs/diagnostics | No Crashlytics/Sentry; Maps SDK and potentially Expo/Agora transmit diagnostics | Reliability/analytics | Maps diagnostics **shared**; Expo/Agora unresolved. |
| Device/install identifiers/push token | Yes for sessions and Customer push registration; retained/rotated | Security, notifications, functionality | Maps identifier **shared**; Expo/FCM unresolved; Render exempt. |

## Captain field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Name, email, phone, user ID | Yes; core identity retained; email can be optional | Account, work, communications, security | Render/Resend exempt; assigned Customer sees safe identity as expected fulfilment. |
| Approximate/precise/background location | Yes while online/assigned active work; operational traces/evidence retained; required only for that work | Dispatch, navigation, safety/security | Maps location **shared**; active Customer/operations transfer expected; Render exempt. |
| Ride/Delivery traces and activity | Yes; assignment/status/timing/chat/call events retained | Functionality, safety, support, security | Render exempt; counterparties expected; Maps portions shared. |
| Earnings/payment references | Yes; earnings, commission, transaction reference/status retained | Finance, account, fraud/security | Render exempt; Flutterwave flow needs product-specific result. |
| Vehicle/identity photos and documents | Yes for application/approval; retained | Eligibility, safety, compliance | **S3 storage NOT CONFIRMED**; admin access is first-party. |
| Push/device IDs | Yes; Expo token registered and retained/rotated | Assignments, calls, security | Expo/FCM sharing unresolved; Render exempt. |
| Diagnostics | Maps; Expo Updates; Agora if calls active | Reliability/analytics | Maps **shared**; Expo/Agora unresolved. |
| Voice/audio | If Agora enabled: stream transmitted; KariGO recording false; provider says RTC stream not stored. KariGO retains session metadata/duration. | Ride communication | Conditional service-provider exception; activation/account/config **NOT CONFIRMED**. |
| Chat/messages | Ride chat retained; no inbox email/SMS collection | Functionality, safety/support | Render exempt; recipient receives as user action. Remove Email/SMS message-content categories unless another path is proven. |

## Partner field matrix

| Play data type | Collected / retention / requirement | Purpose | Sharing conclusion |
| --- | --- | --- | --- |
| Business/contact identity, address, user ID | Yes; role-required and retained | Account, marketplace, compliance/security | Render exempt; approved public/fulfilment identity is expected feature transfer. |
| Device ID | Session/device identifiers exist; no Partner push-registration path found | Security/functionality | Render exempt; Expo Updates telemetry unresolved. |
| Purchase/order activity | Yes; orders, fulfilment and history retained | Functionality, finance/support | Render exempt; Customer/Captain fulfilment transfer expected. |
| Financial/payment references | Yes; onboarding payment, payout account number, settlement and references retained | Finance, account, compliance/fraud | Partner **does** provide a raw payout bank account number to KariGO. Flutterwave onboarding flow remains flow-specific. |
| Product/service images | Yes when chosen; local backend file upload and public URL | Catalogue/functionality | Render hosting exempt; public listing is intended publication, but access controls/lifecycle require review. |
| Files/documents | Yes for onboarding/commercial evidence; retained | Approval/compliance | Render-local/database paths; retention/deletion must be established. |
| App interactions/user content | Catalogue, pricing, availability, order and support actions/content retained | Functionality/security | Render exempt; public/fulfilment recipients as expected. |
| Messages/support | Other in-app/support content only where used; no inbox email/SMS collection | Support/functionality | Render/Resend exempt for applicable payload; remove Email/SMS content absent evidence. |
| Diagnostics | Expo Updates/network telemetry; no Crashlytics/Sentry | Reliability/analytics | Expo telemetry unresolved. |
| Approximate/precise location | **NOT COLLECTED.** No location package, permission or production code path. Business address is not device location. | Not applicable | Remove both Partner device-location types. |

## Raw payment-account answer

**Does KariGO ever receive raw card/bank/payment-account data?**

- Customer and Captain: no raw card entry or bank-account field exists in the reviewed apps/backend checkout inputs. Flutterwave hosted checkout receives payment credentials directly. KariGO sends identity/contact, reference, amount, currency and metadata.
- Partner: yes, KariGO receives and stores a 10-digit vendor payout bank account number in its own backend. This must be declared for Partner under the applicable financial category.
- Customer `User payment info`: removal is **not yet evidence-closed** because full Flutterwave response JSON is stored. Obtain a redacted production response-field inventory and change persistence to an allowlist before concluding no payment-instrument information is received.

## Remaining evidence and readiness

See `provider-owner-evidence-checklist-2026-09-30.md`. The missing essentials are Captain storage identity/lifecycle, Flutterwave returned fields and account terms, Agora activation/recording/account terms, Expo telemetry/account terms, direct FCM/push selector state, Termii/Utilities selectors and agreements, and Maps enabled-API inventory.

Ready to complete Play Step 4: **PARTIAL**. Evidence-supported category, purpose, retention and Google Maps sharing answers can be prepared. Provider-dependent sharing answers listed as unresolved must remain unresolved until the named records are supplied.

## Task 209B-S1-H11.2P reconciliation update — 2026-09-30

Implementation now minimizes new persisted payment evidence, physically deletes eligible Captain/private Partner objects before reporting deletion, and records defined retention states. This does not resolve provider-sharing answers. Customer `User payment info` remains **NOT CONFIRMED** until legacy Flutterwave JSON is cleaned and all other production paths are verified. Captain storage sharing remains unresolved because the provider and contract are unconfirmed. Partner historic onboarding documents require controlled migration from legacy public URLs.
