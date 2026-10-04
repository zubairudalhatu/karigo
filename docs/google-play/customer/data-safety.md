# Customer Data Safety worksheet

Audit date: 30 September 2026; provider closure updated 1 October 2026. Status: **DATA SAFETY READY; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Name, phone, user ID | Collected, account-required, retained; account/functionality/security | Render hosting exempt; assigned-party transfer may be user-initiated. |
| Email | Optional, retained; account/developer communications | Resend and Render payloads qualify for service-provider exception. |
| Address | Feature-required for delivery/Ride, retained | Maps geocode/route transfer is **shared**; Render exempt. |
| Profile image | Optional when chosen, retained where upload succeeds | Hosting/access lifecycle needs confirmation. |
| Approximate/precise location | Foreground and feature-dependent; Ride/operational records retained | Google Maps **shared**; active fulfilment recipient transfer can be user-initiated. |
| User payment info | **Not collected.** No raw card/bank input; hosted checkout; persisted reconciliation payloads are allowlisted and legacy payload cleanup is complete. | Not applicable. |
| Purchase history | Collected and retained for orders/Rides | Render exempt; expected fulfilment transfer; **shared with Flutterwave** because later server verification is not fully covered by the user-initiated exception. |
| Other financial info | Wallet ledger, amounts, references and statuses retained | Render exempt; **shared with Flutterwave** for verification/reconciliation and fraud/security. |
| Other in-app messages | Support/Ride chat when used, retained | Render exempt; recipient receives content through user action. |
| Photos/files | Only chosen profile/evidence/content uploads | Hosting/access lifecycle requires mapping. |
| Voice/audio | Collected only when an optional Agora Ride call is used; ephemeral stream, session metadata retained, no recording | **Not shared under the service-provider exception.** |
| Interactions/searches/user content | Orders, Rides, reviews/support/actions retained; Maps/Expo events transmitted | Maps portions **shared**; Expo Push/EAS portions **not shared under the service-provider exception**. |
| Crash/diagnostics | Maps SDK and conditional Expo/Agora service diagnostics; no Crashlytics/Sentry | Maps diagnostics **shared**; Expo/Agora portions **not shared under the service-provider exception**. |
| Device/install IDs and push token | Session identifiers and Expo push token retained/rotated | Maps identifier **shared**; Expo Push/EAS and downstream FCM **not shared under the service-provider exception**; Render exempt. |

Raw payment answer: Customer does not collect raw card or bank credentials through its UI/API. It sends Flutterwave email/phone, amount, currency, reference and metadata and receives hosted checkout/verification/webhook responses. New persistence is allowlisted and the production legacy-payload cleanup left 12 compliant minimized payloads plus 10 JSON-null/missing payloads with no eligible payload remaining. `User payment info` is therefore not collected by KariGO.

No contacts, call logs, installed-app inventory, broad storage access, background location, Firebase Analytics or Crashlytics was found. The local Customer 1.1.1 implementation adds Google Mobile Ads and UMP; it is not in the released binary yet.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

## AdMob fallback delta — 5 October 2026

This is a **read-only proposed Play delta** for the next Customer native build. Google states that Google Mobile Ads SDK 25.5.0 automatically collects and shares IP address, user product interactions, diagnostic information, and device/account identifiers for advertising, analytics, and fraud prevention. This implementation pins the compatible wrapper at 16.5.0, which resolves Android Google Mobile Ads SDK 25.4.0, so the form must be rechecked against the bundled SDK and current Google disclosure again before submission.

The current Customer form already selects and marks as collected and shared the closest applicable Play types: Approximate location, Crash logs, Diagnostics, App interactions, and Device or other IDs. Proposed changes are therefore purpose/handling updates rather than new type selections:

| Play data type | Proposed Customer form delta |
| --- | --- |
| Approximate location | Keep Collected and shared; add **Advertising or marketing**, **Analytics**, and **Fraud prevention, security and compliance** for the AdMob/IP-derived use. |
| App interactions | Keep Collected and shared; add **Advertising or marketing**, **Analytics**, and **Fraud prevention, security and compliance** for AdMob app/ad interactions. |
| Diagnostics | Keep Collected and shared; add **Advertising or marketing**, **Analytics**, and **Fraud prevention, security and compliance** for SDK performance data. |
| Crash logs | Keep Collected and shared. Google groups SDK crash/performance information under diagnostics; retain the existing declaration and add the same applicable AdMob purposes if Play presents crash logs separately for the final SDK disclosure. |
| Device or other IDs | Keep Collected and shared; add **Advertising or marketing**, **Analytics**, and **Fraud prevention, security and compliance** for advertising ID, app-set ID and applicable device/account identifiers. |

All affected types remain retained/non-ephemeral for the Play answer because the SDK/provider processing is not limited to transient in-memory handling. Required/optional should remain **Required** for these SDK-level signals when the fallback is enabled; the ad placement itself remains consent-gated. Do not add Name, Email, Phone, precise location, payment, message, photo, audio, file, search, or user-content collection on AdMob's behalf. Customer's existing **Contains ads = Yes** declaration remains accurate; adding AdMob does not introduce another App Content declaration category.

## Task 209B-S1-H11.2P implementation evidence — 2026-09-30

- New Flutterwave initialization, verification, and webhook writes persist an explicit reconciliation allowlist instead of full provider JSON.
- The regression fixture proves nested card data, account numbers, authorization values, provider customer profiles, and tokens are excluded.
- `Purchase history` and `Other financial info` remain supported by order/payment/wallet/reference and reconciliation records.
- Do **not** yet remove `User payment info` in Play: legacy JSON may still contain it and the production cleanup was designed but not executed.
- Flutterwave `Shared`/`Not shared` remains unresolved pending executed contract/DPA and independent-use evidence.

## Task H11.2Q read-only update — 30 September 2026

- User payment info remains unresolved until legacy Flutterwave cleanup and post-cleanup verification. Purchase history and Other financial info remain collected. Flutterwave sharing remains unresolved.

## Task 209B-S1-H11.2BJ final reconciliation — 1 October 2026

Production Flutterwave cleanup is complete: 22 inspected, 12 minimized, 10 JSON-null/missing unchanged, zero eligible or failed after cleanup, and a second apply changed zero. Reconciliation fields and relationships were preserved. Customer `User payment info` is therefore **NO**: hosted checkout receives payment credentials, KariGO has no raw Customer card/bank input, and no remaining persisted provider payload contains the excluded instrument/account structures. `Purchase history` and `Other financial info` remain collected and retained. Maps sharing is confirmed; Flutterwave independent-use/exception treatment and Expo/FCM sharing remain NOT CONFIRMED. See `../task209b-final-closeout-2026-10-01.md`.

## Task 209B-S1-H11.2BK provider closure — 1 October 2026

- Flutterwave is active for hosted Customer order checkout and wallet top-up. `User payment info` remains **not collected** by KariGO. Email/phone initialization uses the user-initiated exception. Purchase history and other financial/reconciliation information are **shared** because later server verification is not wholly covered by that exception and Flutterwave independently processes transaction data.
- Expo Push is active. Push/device tokens and routing metadata are collected and retained/rotated, **not shared under the service-provider exception**; push content is transient at Expo. Direct Firebase sending is **not applicable**; FCM is downstream transport and is not double-counted.
- EAS Update is active. OS and randomized installation token are collected, retained and **not shared under the service-provider exception**, for app functionality/reliability.
- Agora is active for optional audio-only Ride calls. Voice is collected only as an ephemeral stream and **not shared under the service-provider exception**. No recording is enabled or invoked; device/network diagnostics are collected conditionally for functionality/reliability.
- Termii is active. Phone number and order/waitlist activity included in transactional notices are **shared** for authentication/account management, functionality, developer communications and security. Do not add SMS/MMS inbox content.
- Utilities external fulfilment is inactive and **not applicable**.
- Provider-dependent answers still unresolved: **0**. See `../task209b-provider-evidence-closure-2026-10-01.md`.
