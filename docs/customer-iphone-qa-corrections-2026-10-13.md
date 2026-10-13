# Customer iPhone QA corrections

Baseline: TestFlight 1.1.1 (2), source 5b734215a63bf99cd94710d4a89d101493daa3bf.

## Findings and changes

- Tester was in Kaduna. Home's geocoder-name matcher accepted only Kano/Abuja/FCT names. Ride used valid GPS coordinates as pickup before backend service-area eligibility. Both used Expo Location; this was not a permissions/geocoder failure.
- iOS Home now resolves city context from the existing Kano/Abuja coordinate boundaries and shares Ride's address formatter. Suburb/alias/geocoder differences do not invalidate coordinates. Valid outside-area coordinates receive an explicit outside-service-area message; denied permission and unavailable GPS remain separate. Backend eligibility continues to control service access. Kaduna is not enabled.
- Previously, push registration ran after sign-in in RideCommunicationHost, automatically requested permission, and swallowed errors. Notifications showed history without a permission/registration control. iOS now reads permission at sign-in, with the native request initiated by Enable notifications. Denied permission opens Settings. Granted/provisional permission obtains an Expo token for the existing EAS project and registers IOS/EXPO/CUSTOMER_APP through the existing backend. Concurrent/repeated registrations are deduplicated; changed tokens and failed registrations remain retryable. Foreground return/token changes refresh the screen. No tokens are displayed or logged. Backend already upserts the unique token and returns safe metadata; no backend runtime change is required.
- Diagnostics uses the installed iOS native build number (2), and retains Android versionCode on Android.
- iOS Profile gives account identity the card's full width under the avatar; no truncation, font-scaling suppression, or fixed text height. Android layout remains unchanged. Actual large-text line wrapping needs physical retest.
- Microphone/call QA: **DEFERRED — Ride service/call flow not available in the tester's current service context.** No artificial prompt or call-flow changes.
- Camera: prior physical evidence of no unsolicited prompt is preserved. No app-owned camera request was added; library photo selection remains unchanged.

## Validation

- Customer TypeScript: PASS.
- Full Customer regressions: all 12 scripts PASS.
- Focused executed tests: coordinate/suburb/alias/outside-area handling, permission denial, GPS/geocoder failure, shared Ride/Home formatter, native notification states/actions, explicit permission request, denied no-repeat behavior, concurrent/token-refresh/retry registration, error redaction, installed iOS/Android diagnostics, full-width scalable identity layout.
- Backend device-token service: 6 tests PASS, including existing iOS token update without duplicate creation or token disclosure. Initial sandbox cache EPERM was resolved by running with a workspace cache.
- iOS production Hermes export: PASS; asset/bundle export complete.
- Expo config introspection: PASS. iOS config/mod results AND Android config/mod results deep-equal the validated camera-correction baseline. Dependencies, permissions, build numbers, runtime, signing and channels unchanged.
- Expo Doctor 1.18.0: 16/17 checks passed; online config-schema check could not complete (`fetch failed`, `ConnectTimeoutError`). This remains a validation limitation, not a confirmed source defect.
- Secret scan and diff whitespace check: PASS; no credentials introduced.
- Public health/readiness read-only check: HTTP 200/status ok; Airtime/Electricity AVAILABLE, Data/Cable TEMPORARILY_UNAVAILABLE. No readiness mutation, paid transaction, GOtv retry, deployment, build, App Store or credential action.

## Delivery gate / physical retest

JS-only, compatible with current iOS runtime 1.1.1. No OTA or build created. Local commit is not pushed; remote checks have not run for these changes. Obtain approval for branch push/checks and one **iOS-only** customer-production OTA before delivering to TestFlight testers; do not publish an Android OTA for this task.

After approved delivery, physically verify Home's Kaduna outside-area message; Notifications undetermined/granted/denied Settings behavior and successful backend token registration; real push reception; iOS diagnostics 1.1.1 (2)/runtime/channel/update; full email at normal and larger text settings; no unsolicited camera prompt; utility labels/history unchanged. Microphone physical QA remains deferred until a real Ride call is available.

Push registration is verified with mocked client tests and backend service tests, **not** a new physical-device registration/delivery test. The existing TestFlight binary still runs its previous bundle until an approved OTA is delivered.
