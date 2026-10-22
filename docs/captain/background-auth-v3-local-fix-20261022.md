# Captain iOS background authentication correction

Local implementation only. No OTA, native build, fixture, backend or Production change is included.

## Physical cause conclusion

The controlled comparison proved the WHEN_UNLOCKED accessibility boundary: unlocked background reads and uploads succeeded; the continuously locked phase reached Core Location, Expo, TaskManager and JavaScript, then failed session retrieval with SECURESTORE_INTERACTION_NOT_ALLOWED. The same resolver/session/work was used, with requireAuthentication=false. The approved conclusion is KEYCHAIN_WHEN_UNLOCKED_CAUSE_PROVEN=YES and CAPTAIN_AFTER_FIRST_UNLOCK_MIGRATION_JUSTIFIED=YES. Raw comparison evidence remains unchanged; the conclusion amendment is recorded separately with those artifacts.

## Storage and migration

Only the Captain iOS client uses the new store. Android retains the existing shared versioned store; Customer and shared configuration sources are unchanged. The new key is `karigo_captain_session_v3`, always written through one helper with SecureStore.AFTER_FIRST_UNLOCK and requireAuthentication=false. The envelope remains schemaVersion=2: key version and payload schema are separate contracts.

Foreground bootstrap authenticates with the server before exposing the user. Migration validates the legacy envelope, rejects expired access tokens, verifies the exact legacy token and identity with /auth/me, writes the exact envelope to v3, reads and validates that copy, and only then deletes v2 and legacy split credentials. The background task reads committed v3 only; legacy-only state requires foreground migration. A failed write or readback preserves v2 for a fresh foreground attempt and cannot authorize the background task.

A non-credential SecureStore fence records pending/active/blocked state. Serialized writes, revision tickets, generation checks and immediate invalidation prevent stale refresh or migration from resurrecting a logged-out session. New login and refresh share the explicit v3 accessibility writer. Logout, invalid-session cleanup, revocation, reset and the existing account-deletion-to-logout path remove both keys and split tokens. If deletion fails, a blocked fence prevents using leftover credentials; cleanup reports failure rather than claiming deletion succeeded.

AFTER_FIRST_UNLOCK does not grant access before the first unlock after reboot. No accessibility bypass, authorization relaxation or alternate plaintext credential storage is added.

## Transient read handling

Captain iOS background callbacks allow at most three local credential reads within one 2-second callback-local budget, with 250/750 ms backoff. Only tagged SecureStore read errors are retryable. Confirmed corruption, missing/invalid session, revocation and work mismatch retain fail-closed behavior. Interaction-not-allowed maps to SECURESTORE_PROTECTED_DATA_UNAVAILABLE.

During retry, eligible samples use only the existing Captain UUID/work UUID/epoch buffer (100 points, 15-minute operational TTL). No upload occurs until durable auth, server identity, accepted work and current epoch checks all pass. Exhaustion stops the captured tracker and clears its namespace; late old callbacks cannot stop a newer assignment or reuse its buffer. No persistent retry job is created. JavaScript suspension can delay timer execution; the budget is checked again on resumption and is not claimed as a native hard wall-clock stop guarantee.

Normal location options, diagnostic limits/default-off behavior, server authorization and pre-upload work checks remain unchanged. Diagnostics include fixed categories only, without raw errors or credential/identity/location values.

## Local validation and release boundary

Validation covers actual iOS client wiring, fresh login, exact migration, cold/locked reads, pre-first-unlock denial, write/readback failure and retry, expired/revoked/wrong-identity rejection, refresh policy, corruption cleanup, partial deletion, same-generation invalidation, logout/migration races, bounded/hung auth reads, assignment changes during retry, stale buffers, Android's existing behavior, Captain regressions, readiness, location, API client, native patch guards and TypeScript.

All listed local gates passed, including TypeScript, the credential/diff scan and a fresh iOS-only Hermes export (1,404 modules, 4,433,980-byte HBC; SHA-256 a91e8a44c44715f89d5fa8fc9b298dc3bb8275ccb8329bfbae23402d7bac0ccc). The exported bundle contains the v3 key and captain-bg-auth-v2 marker; source hashes remained unchanged during export. Detailed validation artifacts are stored outside the checkout under C:/Dev/KariGO/artifacts/captain-background-auth-fix-local-20261022.

This is a JS_OTA_ONLY correction compatible with TestFlight 1.2.0 (2), runtime 1.2.0-captain-nativeqa2, channel captain-ios-native-qa. No backend change or native rebuild is required. Local tests do not substitute for the separately approved post-release locked-device physical verification.
