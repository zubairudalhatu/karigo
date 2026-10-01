# Task 209B provider evidence closure — 1 October 2026

Status: **A — PROVIDER EVIDENCE CLOSED — DATA SAFETY READY**. This is an evidence worksheet only. Production and Google Play were not changed.

Google Play's applicable rules are the service-provider exception for processing solely on the developer's behalf, the exception for a specific user-initiated transfer the user reasonably expects, and the requirement to declare sharing when a provider uses identifiable app data for its own purposes. A row is marked shared if any active transfer of that data type lacks an exception.

## Production activation summary

| Provider/feature | Customer | Captain | Partner | Evidence-backed result |
| --- | --- | --- | --- | --- |
| Flutterwave | Active: hosted order checkout and wallet top-up | Inactive: commission-payment gate off | Inactive: onboarding-payment gate absent/off | Only Customer has an active app-to-Flutterwave flow. |
| Expo Push | Active: Expo token registration and Expo sender | Active: Expo token registration and Expo sender | Inactive: no notification dependency or token-registration path | Google FCM is Expo's downstream Android transport, not a direct KariGO sender. |
| Direct Firebase/FCM sender | Inactive | Inactive | Inactive | The Firebase provider is a disabled stub; classify the direct-sender flow NOT APPLICABLE. |
| EAS Update | Active | Active | Active | Each production app has an EAS project ID, update URL and app-version runtime policy. |
| Agora RTC | Active | Active | Inactive | Customer and Captain implement audio-only Ride calls. |
| Termii | Active | Active | Active | Termii is selected for OTP and enabled transactional SMS paths. |
| Utilities/Accelerate fulfilment | Inactive | Inactive | Inactive | Provider readiness exists, but public production config has customer purchase, wallet payment and live fulfilment off. No app-to-provider user-data transfer occurs. |

## Flutterwave

The hosted checkout initialization sends a transaction reference, amount, currency, redirect URL, Customer email and phone, and order/payment-purpose metadata. Flutterwave collects the payment instrument directly on its hosted page; KariGO does not receive raw Customer card or bank-account input. New provider evidence is allowlisted, and the completed production cleanup left 12 minimized records and 10 JSON-null/missing records with zero remaining eligible payloads.

| App / data type | Collected? | Shared? | Exception used? | Purpose and evidence |
| --- | --- | --- | --- | --- |
| Customer — User payment info | **No** | **No** | Not applicable | Raw card/bank credentials are entered on hosted Flutterwave checkout and are absent from KariGO inputs and persisted provider evidence. |
| Customer — Email and phone number | **Yes** | **No** | **User-initiated exception** | Sent only when the user starts a specific checkout/top-up and reasonably expects the payment provider to receive contact details. Purpose: payment functionality and account/transaction communications. |
| Customer — Purchase history | **Yes** | **Yes** | User-initiated exception applies to checkout initialization, but not to all later server verification/reconciliation | Order ID/number, payment purpose, amount and currency are sent during initialization; KariGO later sends the transaction reference in server-to-server verification. Flutterwave independently processes transaction data for processing, fraud, compliance and service improvement. Purpose: app functionality and fraud prevention/security. |
| Customer — Other financial info | **Yes** | **Yes** | Same split as Purchase history | Transaction/provider references, amount, currency and status support background verification and reconciliation. The non-exempt server verification means the final Play row is shared. Purpose: app functionality and fraud prevention/security. |
| Customer — internal event identifiers in payment metadata | **Yes** | **Yes**, represented with the applicable purchase/financial row | No exception for background verification | Payment/order identifiers are pseudonymous reconciliation data, not a raw payment instrument or a KariGO account credential. |
| Captain — Flutterwave data | **No active provider flow** | **No** | **NOT APPLICABLE** | The Captain commission-payment gate is off. Historical schema/code capability does not create a current app transfer. |
| Partner — Flutterwave data | **No active provider flow** | **No** | **NOT APPLICABLE** | The Partner onboarding-payment gate is absent/off. Partner payout-bank data remains collected by KariGO, but it is not sent through an active Flutterwave Partner flow. |

Incoming Flutterwave webhooks are data collected by KariGO, not data shared by the app. They do not create a second outgoing sharing event.

## Expo Push, FCM and EAS Update

Expo's terms state that it acts as processor for app end-user User Data; any controller use is limited to aggregated or de-identified data. Expo stores end-user push tokens, treats push content transiently until delivery, and uses Google as the Android push subprocessor. Its EAS Update requests contain the operating system, project ID and a randomized installation token. These active end-user transfers qualify for the Google Play service-provider exception.

| App / flow | Final Play classification | Retention | Purpose |
| --- | --- | --- | --- |
| Customer Expo Push | Device or other IDs **collected; not shared / service-provider exception**. Notification routing/event metadata is collected where included. | Expo push token and KariGO token registration are retained/rotated; notification content is transient at Expo. | App functionality and developer communications; security for token ownership. |
| Captain Expo Push | Device or other IDs **collected; not shared / service-provider exception**. Assignment/call routing metadata is collected where included. | Same as Customer. | App functionality and developer communications; security for token ownership. |
| Partner Expo Push | **NOT APPLICABLE** | Not applicable | No notification dependency, token acquisition or registration path. |
| Customer EAS Update | Randomized installation token/device ID and OS **collected; not shared / service-provider exception**. Project ID is application configuration, not user data. | Not ephemeral; exact provider duration is governed by Expo's account/privacy terms. | App functionality and reliability. No Crashlytics/analytics payload is inferred. |
| Captain EAS Update | Same as Customer | Same as Customer | App functionality and reliability. |
| Partner EAS Update | Same as Customer; production app config includes its EAS update URL/project ID | Same as Customer | App functionality and reliability. |
| Direct Firebase sender, all apps | **NOT APPLICABLE** | Not applicable | KariGO's direct Firebase provider is disabled. Do not duplicate Expo's downstream FCM transport as a direct KariGO sharing row. |

FCM may use a Firebase installation ID to deliver Expo-originated Android messages. That downstream processing stays within Expo's disclosed subprocessor chain; it does not change the service-provider outcome or create a direct-FCM sender answer.

## Agora RTC

Production selects Agora and enables in-app Ride calls. Both mobile clients initialize only audio, never enable video, and display that calls are not recorded. The backend always returns `recordingEnabled: false`. The signed-in Agora account shows the secure production project **KariGO Ride Voice** and reports **Cloud Recording: Inactive**, with zero recording usage. No Cloud Recording REST credential, recording endpoint, recording API invocation or server-side recording destination exists in production code/configuration.

Agora's current privacy notice treats Enterprise Customer RTC end-user data as processor data handled on customer instructions. Production RTC audio is streamed and not stored. Agora may retain dynamic IP/network/session metadata for up to 30 days and device information for up to 365 days for routing and service-quality diagnostics.

| App / data type | Collected? | Shared? | Retention | Purpose |
| --- | --- | --- | --- | --- |
| Customer — Voice/audio | **Yes, only when the user uses a Ride call** | **No / service-provider exception** | Ephemeral stream; no recording | App functionality. |
| Captain — Voice/audio | **Yes, only when the user uses a Ride call** | **No / service-provider exception** | Ephemeral stream; no recording | App functionality. |
| Customer/Captain — Device IDs, network and diagnostics | **Yes when a call is used** | **No / service-provider exception** | Provider metadata retained under the periods above; KariGO retains call-session status/timing metadata | App functionality and analytics/reliability. |
| Partner — Agora | **NOT APPLICABLE** | **No** | Not applicable | No Partner RTC path. |

Cloud Recording enabled for the implemented production flow: **NO**, confirmed in the signed-in project account. Recording API invoked: **NO**. Server-side recording/storage configured: **NO**. Stored voice recordings must not be declared.

## Termii and Utilities

Termii receives the destination phone number and KariGO-generated OTP or transactional SMS body. Depending on the event, the body can contain an order/application reference, application status or a Captain applicant name sent to a guarantor. Termii's current policy applies to APIs and end users and allows independent security, fraud, analytics and service-improvement processing; it does not establish instruction-only treatment for all identifiable API recipient data. Therefore no blanket service-provider exception is used.

| App | Final Termii classification |
| --- | --- |
| Customer | Phone number **collected and shared**. Purchase/order or Ride-waitlist activity embedded in an enabled transactional SMS is **collected and shared**. Purposes: account management/authentication, app functionality, developer communications and fraud prevention/security. Do not select SMS/MMS inbox content: KariGO sends developer-generated notices and does not read the user's SMS inbox. |
| Captain | Phone number and, for relevant application/guarantor notices, name and application activity **collected and shared**. Same purposes as Customer. Do not select SMS/MMS inbox content. |
| Partner | Phone number and application activity/status **collected and shared**. Same purposes as Customer. Do not select SMS/MMS inbox content. |

Termii data is not ephemeral under its published retention statement. Utilities/Accelerate app data is **NOT APPLICABLE** for all three apps because customer purchase, wallet payment and live fulfilment are inactive. Provider readiness/configuration alone is not a user-data transfer.

## Final unresolved count

| App | Provider-dependent Play answers still unresolved |
| --- | --- |
| Customer | **0** |
| Captain | **0** |
| Partner | **0** |

All three Data Safety forms can now be completed truthfully from the evidence matrix. This conclusion closes only the named provider-dependent answers. It does not submit a Play form, approve legal retention periods, or change any provider configuration.

## Official sources

- [Google Play Data Safety definitions and sharing exceptions](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Flutterwave Privacy Notice](https://flutterwave.com/ng/privacy-notice)
- [Flutterwave Merchant Service Agreement](https://app.flutterwave.com/dashboard/onboarding/agreement)
- [Expo privacy explained](https://expo.dev/privacy-explained)
- [Expo Terms of Service](https://expo.dev/terms)
- [Expo push notification FAQ](https://docs.expo.dev/push-notifications/faq/)
- [Expo subprocessors](https://expo.dev/privacy/subprocessors)
- [Firebase privacy and security](https://firebase.google.com/support/privacy/)
- [Agora Privacy Policy](https://www.agora.io/en/privacy-policy/)
- [Termii Privacy Policy](https://termii.ai/privacy-policy)
- [Termii Data Protection Policy](https://termii.ai/data-protection)
