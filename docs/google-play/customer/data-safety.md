# Customer Data Safety worksheet

Audit date: 30 September 2026. Status: **PARTIAL; Play form unchanged**.

| Data type | Evidence-supported handling | Play sharing result |
| --- | --- | --- |
| Name, phone, user ID | Collected, account-required, retained; account/functionality/security | Render hosting exempt; assigned-party transfer may be user-initiated. |
| Email | Optional, retained; account/developer communications | Resend and Render payloads qualify for service-provider exception. |
| Address | Feature-required for delivery/Ride, retained | Maps geocode/route transfer is **shared**; Render exempt. |
| Profile image | Optional when chosen, retained where upload succeeds | Hosting/access lifecycle needs confirmation. |
| Approximate/precise location | Foreground and feature-dependent; Ride/operational records retained | Google Maps **shared**; active fulfilment recipient transfer can be user-initiated. |
| User payment info | No raw card/bank input; hosted checkout. Full provider responses are persisted. | **Do not remove yet** until a redacted Flutterwave returned-field inventory proves no mapped instrument/account field and storage is allowlisted. |
| Purchase history | Collected and retained for orders/Rides | Render exempt; expected fulfilment transfer; payment-provider result is flow-specific. |
| Other financial info | Wallet ledger, amounts, references and statuses retained | Render exempt; Flutterwave classification depends on exact user-initiated flow/terms. |
| Other in-app messages | Support/Ride chat when used, retained | Render exempt; recipient receives content through user action. |
| Photos/files | Only chosen profile/evidence/content uploads | Hosting/access lifecycle requires mapping. |
| Voice/audio | Only if Agora Ride calls are active; implementation records metadata, not audio | Activation/account/recording settings **NOT CONFIRMED**. |
| Interactions/searches/user content | Orders, Rides, reviews/support/actions retained; Maps/Expo events transmitted | Maps portions **shared**; Expo telemetry unresolved. |
| Crash/diagnostics | Maps SDK and possibly Expo/Agora; no Crashlytics/Sentry | Maps diagnostics **shared**; other SDK fields unresolved. |
| Device/install IDs and push token | Session identifiers and Expo push token retained/rotated | Maps identifier **shared**; Expo/FCM unresolved; Render exempt. |

Raw payment answer: Customer does not collect raw card or bank credentials through its UI/API. It sends Flutterwave name/email/phone, amount, currency, reference and metadata and receives hosted checkout/verification/webhook responses. Because responses are stored wholesale, `User payment info` removal is not final until a redacted returned-field inventory and response allowlist close that gap.

No contacts, call logs, installed-app inventory, broad storage access, background location, advertising ID, ad SDK, Firebase Analytics or Crashlytics was found.

See `../provider-evidence-matrix-2026-09-30.md` and `../provider-data-safety-reconciliation-2026-09-30.md`.

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
