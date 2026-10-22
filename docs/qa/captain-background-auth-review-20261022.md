# Captain background session review — 22 October 2026

Local review of TestFlight 1.2.0 (2), source baseline 1c8474cb5286adb4b2efe9f2fc0996d44194aa01. No Production actions, fixtures, builds, OTA publication or commits in this task.

## Evidence and limits

The confirmed test lasted about 180 seconds, exceeded 150 metres and remained continuously backgrounded. The native callback, batch gate, TaskManager dispatch and JS callback succeeded. At 16:28:33.066Z the JS callback had appForeground=false and one location. At 16:28:33.075Z AUTH reported sessionAvailable=false, reason UNKNOWN, then STOP. No work lookup, filtering, buffering or upload followed. The pre-foreground server snapshot retained only two startup samples. Their HTTP 200 uploads were foreground baseline evidence, not background delivery.

The original initial-session exception handler emits UNKNOWN; the null-session branch emits only sessionAvailable=false without UNKNOWN. This identifies an exception in the initial readSession call, rather than proving null credentials, failed refresh, React hydration, or missing native delivery. The underlying exception was not retained. Device lock state and protected-data availability were not captured. Neither can be reconstructed from appForeground=false.

Physical failure boundary remains F (background auth/session). This task's separate smallest-fix classification is G (exact exception cause not established). Static WHEN_UNLOCKED incompatibility with locked background access is proven, but that does not prove that this particular callback occurred while locked. The blanket-stop policy is also an evidenced code issue.

## Exact resolver and storage

Task karigo-captain-active-work-location -> authSessionStore.readSession -> shared createVersionedAuthSessionStore.readSession -> readStoredEnvelope -> SecureStore.getItemAsync(karigo_captain_session_v2). JSON schema validation requires a nonempty access/refresh pair, schemaVersion=2, savedAt string and finite sessionGeneration. If absent, migrateLegacySession reads karigo_rider_access_token and karigo_rider_refresh_token, then writes a v2 envelope and deletes legacy keys.

Foreground createApiClient.tokenStore.getToken -> the same readSession; refreshTokenStore also reads that same envelope. React AuthProvider hydrates UI/user state but is not required by this resolver. No Redux/Zustand/context token, memory token cache, or AsyncStorage is used. A module generation counter and refresh-flight promise exist for concurrency, not as credential sources. Headless tests instantiate a fresh module runtime over retained durable storage with React imports forbidden and retrieve the pair successfully.

Current access AND refresh tokens reside in the same encrypted SecureStore item karigo_captain_session_v2. Legacy keys above are migration inputs, not an alternative background-only token store. No SecureStore options are supplied by the session store: on iOS the default is WHEN_UNLOCKED; requireAuthentication=false; keychainService omitted resolves in installed native code to app, then app:no-auth for the normal alias (app:auth and legacy app aliases are also searched). Access group is default application scope. No biometric prompt is required for auth item retrieval. This applies to both reads and writes. Changing read options alone cannot change an existing item's creation attributes.

Work metadata is separate: karigo.captain.traceScope.v2 and work/epoch-specific karigo.captain.trace.v2.* buffers. Operational scope/buffer and JS QA evidence explicitly use AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY. Work scope stores Captain/work UUID, mode, epoch and start timestamp; it is not a substitute for authentication. Buffer limits remain 100 points and 15 minutes. Diagnostic rings remain opt-in, JS48/native64, 30-minute retention, allowlisted metadata only.

## All false-session/stop branches

- Initial readSession throws: SecureStore v2 read; JSON/schema corruption; legacy reads; incomplete legacy pair; or migration write failure. Previously all went through generic diagnosticFailure and could become UNKNOWN. Stop and clear scope/buffer follow if this callback still owns the runtime.
- Initial readSession returns null: no v2 and neither legacy token. Stops and clears scope. This cannot distinguish never-persisted credentials from logout/deletion without separate durable evidence; do not invent that distinction.
- authApi.me throws after a successful session read: AUTH false with sanitized API/network/storage error; current policy stops captured scope. No identity/work authorization bypass.
- Start path reads no session: emits false and refuses to start. A thrown start-path read propagates; it does not authorize work.
- Missing scope, identity/work mismatch, generation/epoch change, work lookup failure, definitive upload statuses 401/403/409 also reject or stop under the existing rules. They must not be relabeled initial credential-read failures.

## Expiration, refresh and cleanup

readSession validates envelope shape, not JWT expiry. No local token decoding establishes server authorization. authApi.me and subsequent requests use shared createApiClient. A first 401 invokes Captain refreshAuth -> performRefreshAuth -> durable refresh token -> POST /auth/refresh, then atomically persists the returned pair and retries the original request. Temporary refresh failures (429, 5xx, network/timeouts) retain the session; definitive rejection/revocation clears credentials. Final 401 clears auth through onUnauthorized. The background callback nevertheless currently stops on the temporary exception from me as well. If the initial SecureStore read itself throws, it cannot obtain a refresh token and never reaches this refresh path.

Logout stops background tracking/deactivates push, advances session generation, attempts normal server logout, and deletes v2 plus both legacy keys. Reset saved login deletes all auth keys; account-deletion UI invokes the normal logout workflow. Existing generation checks prevent stale refresh callbacks from authorizing a newer session. Focused tests verify cold durable retrieval, null/throw/corruption, successful expired-token refresh, temporary refresh preservation, revoked refresh deletion, and logout/reset deletion. Existing location tests cover work A/B, epoch races, late stop/ack, legacy buffer discard, lifecycle and missing auth.

## Local changes actually made

Captain-only storage adapter preserves the same keys, default options, writes/deletes and auth decisions, while tagging read exceptions with a fixed sanitized reason. A pure background-session resolver records the reason then rethrows, retaining fail-closed behavior. No tokens, raw errors, identities, coordinates or storage values enter the ring. Reasons include secure-store null/read-error, parse failure, refresh failure and OTHER; interaction-not-allowed is distinct from proven protected-data unavailability. A protected-data-specific classification requires explicit supplied evidence; installed SecureStore does not itself provide a reliable device-lock flag. Reserved categories such as SESSION_NOT_PERSISTED, ACCESS_TOKEN_EXPIRED, REFRESH_TOKEN_UNAVAILABLE and IN_MEMORY_STATE_UNAVAILABLE must not be emitted by guessing from a generic null or exception. Current resolver has no in-memory dependency. Work/session mismatches remain explicit FILTER WORK_CHANGED/SESSION_CHANGED evidence.

No credential accessibility change, migration, bounded-auth retry, token cache, plaintext fallback or stop-policy relaxation was implemented. The adapter also runs on Captain Android because the same shared callback/store code has the same error-classification issue; no Android-specific behavior/configuration or release changed. Customer/Partner and backend files are untouched.

## Policy and smallest secure correction proposal

STOP_ON_ANY_AUTH_LOOKUP_FAILURE_IS_CORRECT=NO as a blanket operational policy: a retrieval exception or temporary refresh/network outage is not confirmed logout/revocation. Never uploading without valid auth is correct. Keeping the current conservative stop during diagnosis is safer than adding an unreviewed permissive fallback. Any future bounded retry must retain work/epoch ownership, honor logout/revocation immediately, bound retention/tracking, and revalidate identity plus current server work before upload. Do not upload under an in-memory last-good token or reattach samples to a new assignment. Do not claim a reliable wall-clock stop from a JS timer that can be suspended in the background. Prefer discarding unauthenticated samples to expanding collection until that policy is reviewed.

If the read failure is confirmed to be locked Keychain access, use a Captain-only background-compatible encrypted envelope with AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY, never Always. Both access and refresh are necessary for the existing background refresh chain. Do not change Customer/Partner storage or unrelated secrets. Obtain product/security review of that accessibility change.

Installed expo-secure-store is 14.2.4: SecureStoreModule.swift set creates kSecAttrAccessible on SecItemAdd, but its duplicate-item update dictionary contains only kSecValueData. Therefore overwriting v2 with new JS options does NOT migrate its accessibility in this installed version, unlike newer documentation. A safe proposed JS-only migration uses a NEW Captain session key: after successful foreground server authentication, read the old encrypted pair, write the new key with explicit accessibility, read back/validate, then delete old/legacy keys. Never delete first. Reuse generation fencing and recheck it across awaits; logout/reset/deletion must delete BOTH new and old keys, including interrupted-migration recovery; no fallback may resurrect a revoked/logged-out old envelope. Refresh writes must use the new key. Crash/failure rollback, old-key compatibility and concurrent logout tests are required BEFORE implementing/releasing this migration. No tokens enter plaintext storage or reports. Fresh server validation and normal refresh revocation remain authoritative.

## Release decision

The local diagnostic patch is JS_OTA_ONLY on the existing Build2 runtime; no native API change or backend change is needed. A new-key accessibility migration is technically possible in JS using the installed SecureStore constants, subject to the review/tests above. No IPA is required merely to change a new item's accessibility. A proposal to inspect native protected-data availability directly would be a separate native change, not part of this patch. Exact functional fix approval remains blocked by the missing original read-exception classification; no new physical attempt is started here.

## Sources

Installed source: packages/config/src/mobile-session.ts; apps/rider-app/src/api/client.ts; apps/rider-app/src/lib/background-location.ts; node_modules/expo-secure-store/ios/SecureStoreModule.swift and SecureStoreOptions.swift. Installed version, rather than newest Expo documentation, determines overwrite behavior.

- https://docs.expo.dev/versions/v53.0.0/sdk/securestore/
- https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility
- https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlockthisdeviceonly

## Validation

PASS: Captain full regression command; headless/background auth resolver tests; null/error/corruption tests; expiry/refresh/revocation/logout/reset; account-deletion normal logout linkage; location/background lifecycle and work/epoch/retry isolation; readiness/current area; shared API guards; Captain typecheck; native diagnostic patch/bridge guards. PASS: fresh iOS Hermes export (1,402 modules, bytecode magic verified), diff whitespace/scope and credential-pattern scans. Validation artifact: C:/Dev/KariGO/artifacts/captain-background-auth-local-20261022/validation.json. Tests simulate storage faults, not an actual locked iPhone Keychain. No physical root-cause claim is made from mocks.


## Diagnostic release preparation addendum

The release now observes per-read SECURESTORE_RETURNED_NULL (without claiming whole-session failure), reports SESSION_NOT_PERSISTED when the complete durable resolver returns null (meaning absent now, not proof it was never saved), emits REFRESH_TOKEN_UNAVAILABLE for an observed incomplete envelope/refresh entry point, REFRESH_FAILED on failed refresh responses, and WORK_SESSION_MISMATCH before the existing rejection. Known fixed evidence codes are mapped to the full required category enum. All codes are covered by the classifier tests. An observer exception cannot change auth behavior. A known Expo Keychain interaction-not-allowed message is converted to a fixed enum without logging message contents and without inferring screen lock.

SECURESTORE_PROTECTED_DATA_UNAVAILABLE requires explicit protected-data evidence; existing SecureStore 14.2.4 does not reliably supply that flag. Without it, a failure remains SECURESTORE_READ_ERROR or SECURESTORE_INTERACTION_NOT_ALLOWED. ACCESS_TOKEN_EXPIRED requires an explicit code; a generic 401 is not proof of expiry. IN_MEMORY_STATE_UNAVAILABLE is a supported explicit code but not expected from the current durable resolver. These limits must accompany the eventual lock-state test; enum support is not a claim that an unobserved condition occurred. No session/accessibility migration, refresh/logout change, authorization relaxation or stop-policy change is included.
