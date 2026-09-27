# Provider and Data safety reconciliation — working evidence, 27 September 2026

Not a completed declaration or legal opinion. Current source, active-artifact scope and provider configuration must agree before submission. Ordinary physical-service checkout is distinct from lending/credit; the owner confirms no BNPL anywhere. Internal-only builds must not silently drive public declarations for features absent from distributed production/closed builds. Verify build/OTA lineage before finalizing.

## Provider-specific transfer assessment
| Provider / actual evidence | Data and apps | Instructions-only versus independent use | Subprocessors / Play sharing consequence |
|---|---|---|---|
| Render: owner-confirmed KariGO project, Frankfurt backend and PostgreSQL resource | All3 backend profile, orders, location where used, payments, messages and uploaded metadata; network/usage records | DPA2 supports processor treatment for hosted payloads. DPA9 independently controls account/usage data for security, fraud and optimization. | AWS/GCP/Cloudflare/ClickHouse list; payload hosting can meet service-provider exception; independently used end-user usage data requires separate classification. Admin billing is not automatically mobile user data. |
| Flutterwave: actual checkout/topup/commission/onboarding code; PAYMENTS_PROVIDER confirmed | Customer checkout/wallet, Captain fees, Partner onboarding; names/contact/payment references/amounts and provider responses | Nigeria privacy notice includes own fraud/legal and service-improvement purposes. No blanket processor-only conclusion. Backend retains provider responses, so do not assume the app never accesses payment data. | Partners/subprocessors disclosed. Assess each user-initiated payment transfer against Play's expected user action/consent exception; independent use outside it requires sharing. Contract detail unresolved. |
| Agora RTC: Customer/Captain SDK and call backend | Voice streaming; UID/channel, IP, device/network diagnostics | RTC end-user table says on enterprise customer's behalf/instructions; audio streaming not stored. Account/site marketing is a different data flow. Contract applicability and exact SDK version remain to confirm. | Service providers/subprocessors; potential processor exception for RTC payload, not blanket platform data. Ephemeral voice may qualify only if no recording/retention; diagnostics are retained separately. |
| Google Maps SDK and Places/routes: Customer/Captain source, API config names | Map/location requests, device pseudonymous ID, IP, diagnostic/crash information, conditional map interaction data | Android SDK disclosure describes data used to improve Google services. Independent-controller terms must be matched separately to SDK versus server APIs. | No blanket processor exception. Declare supported SDK sharing categories after matching actually shipped SDK and products. IP category depends on its use, not merely IP existence. |
| Expo Updates all3; push Customer/Captain code and configuration | Update/app/device/network diagnostics; push tokens/payload where activated | Privacy notice covers service/security/improvement purposes; no sufficient processor-only proof for every end-user flow. | Current subprocessor list includes hosting and business systems; do not infer all receive app data. Push payload, token and update telemetry require separate review. |
| Firebase FCM via push pathway, no Analytics/Crashlytics implementation found | Customer/Captain installation IDs, push delivery content/metadata | Firebase customer data processor terms differ from Google-controlled Firebase Service Data; service data may be used for improvement. | FCM installation ID retention documented until deletion plus180days. No dedicated crash SDK does not mean no SDK diagnostics. Match Expo/FCM delivery route and terms before final answer. |
| Resend: actual activation/receipt/application email code; receipt provider selector confirmed | Account email address, recipient identity, transaction/application message content; all3 as features use it | DPA2 processor for customer payload; DPA9 independent controller for account and usage/routing data. | AWS sending/hosting and other listed subprocessors. Body processor exception does not automatically exempt independently used recipient/routing data. Sending transactional email is not evidence of reading users' inboxes. |
| Termii: SMS/OTP implementation and configured keys; live activation unconfirmed | Phone numbers and OTP/notification content for enabled flows | Current platform privacy/data-protection notices include security/service-improvement; instructions-only DPA not established. | Carrier/subprocessor flows need contractual review. No evidence of SMS inbox access; do not conflate sending OTP with READ_SMS permission. |
| iRecharge/Accelerate utilities: actual irechargetech.com endpoints; activation unconfirmed | Customer utility account/meter/phone, service/amount/transaction records | Primary privacy notice includes own security/quality/training purposes; current API contract unverified. | Supplier/service-provider transfers; no blanket processor exception. Need enabled product and user-initiated transaction analysis. |
| S3-compatible upload storage | Captain/Partner chosen photos and identity/business documents | Endpoint/provider remains masked and unidentified | Requires review. Do not assume AWS merely because the client uses an AWS SDK. |
| Vercel website hosting | Web portal/privacy/deletion/contact flows; mobile scope depends on embedded web flow | Public March2026 DPA reviewed: Pro/Enterprise customer payload processing on instructions; Service-Generated Data/contact data independently controlled. Actual plan/configuration unverified | Requires review; do not silently treat as no sharing. |

## Per-data-type working matrix
C=Customer, K=Captain, P=Partner. Retained means not ephemeral. This table records source behavior; validate distributed versions and SDK scope. Required/optional is evaluated across actual supported journeys, not just whether a permission prompt can be refused.

| Data | Source collection | Retention / requirement | Purposes | Sharing determination |
|---|---|---|---|---|
| Name, phone, user ID | C/K/P Yes | Retained; account required | Account management, functionality, fraud/security | Operational recipient and SMS/email/hosting flows above; recipient exceptions per flow, unresolved providers require review |
| Email | C/K/P when supplied/required by role | Retained; optional Customer, role-dependent others | Account management, developer communication | Resend payload versus routing split; no blanket No |
| Address | C/K/P for service/business/application | Retained; service-dependent | Functionality/account setup | Assigned Captain/Partner expected fulfilment; hosting processor scope; other recipients review |
| Device GPS approximate/precise | C/K Yes; P no GPS feature/permission found in active6/3 | Operational records retained; permission/feature-dependent | Functionality/safety; not location advertising | Maps versus operational counterparties assessed separately. P address is not device GPS |
| Payment info / purchase history / other financial info | C wallet/orders; K earnings/fees; P onboarding/settlement/orders | Retained, relevant transaction required | Functionality, fraud/security, legal/financial reconciliation | Flutterwave contract and payment response fields; full card data not established. Do not infer no payment data merely from hosted checkout |
| In-app messages | C/K assignment/support; P relevant support flow to verify | Retained | Functionality/support | Counterparty expected communication versus provider processing; review |
| Email/SMS content | No inbox-reading permission or functionality found | Transactional outbound messages do not prove user inbox collection | Authentication/developer communications | Sender services still receive identity/content; classify transferred underlying data accurately |
| Photos | C optional profile/evidence; K identity/vehicle; P onboarding/catalogue | Retained; optional C, role/approval-dependent K/P | Functionality/account management | Operational/public catalogue recipients, storage provider unresolved |
| Files/docs | K/P onboarding; normal C document feature not found | Retained, role-dependent | Functionality/compliance | Storage/reviewer processors unresolved |
| Voice | C/K Agora optional calls | Streaming; no recording found; other call metadata retained | Functionality | RTC processor evidence conditional; service version/recording settings require final confirmation |
| App interactions/searches/reviews | C search API and service reviews; K/P operations/activity | Stored reviews/events; query-log retention unresolved | Functionality, security, analytics where actually used | SDK/hosting usage roles; user-initiated/public publication exceptions per transfer |
| Device/session/push IDs | C/K/P auth/update; C/K push | Retained/rotated; account and SDK-dependent | Functionality/security, SDK analytics where documented | SDK and hosting matrix above |
| Crash logs/diagnostics | Maps/Agora/Expo as used; no separate Crashlytics/Sentry found | SDK retention; cannot mark all ephemeral | Functionality/analytics | Vendor-specific independent usage versus instructed service distinction |

HTTPS API and public deletion URLs verified. Live deletion using dedicated reviewer accounts not tested; backend deletion tests passed with mocks. Provider end-to-end encryption is not the same as encryption in transit; final all-data-in-transit answer needs every actual provider path covered. No provider-sharing unknown may be treated as verified No.

## Primary sources
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
- Render: https://render.com/dpa ; https://render.com/privacy ; https://render.com/security
- Flutterwave Nigeria: https://flutterwave.com/ng/privacy-notice
- Agora: https://www.agora.io/en/privacy-policy/
- Maps SDK disclosure: https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure?hl=en
- Google controller terms: https://business.safety.google/controllerterms/
- Expo: https://expo.dev/privacy ; https://expo.dev/privacy/subprocessors
- Firebase: https://firebase.google.com/support/privacy
- Resend: https://resend.com/legal/dpa ; https://resend.com/legal/subprocessors
- Termii: https://termii.com/privacy-policy ; https://termii.com/data-protection
- iRecharge: https://www.blog.irecharge.ng/privacy-policy-2/

Owner update: no verified contracts/DPA pack is available. All evidence-dependent final sharing decisions remain NOT CONFIRMED pending agreement applicability and per-data-type review. Public terms above are provisional evidence, not final blanket exceptions. See missing-compliance-evidence-2026-09-27.md.

Vercel primary sources: https://vercel.com/legal/dpa ; https://vercel.com/legal/privacy-notice
