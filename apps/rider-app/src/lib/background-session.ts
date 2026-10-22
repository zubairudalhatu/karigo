// No React, token cache, raw error logging, or alternative credential store.
export const backgroundAuthReasons = [
  "SESSION_NOT_PERSISTED", "SECURESTORE_RETURNED_NULL", "SECURESTORE_READ_ERROR",
  "SECURESTORE_PROTECTED_DATA_UNAVAILABLE", "SECURESTORE_INTERACTION_NOT_ALLOWED",
  "TOKEN_PARSE_FAILURE", "ACCESS_TOKEN_EXPIRED", "REFRESH_TOKEN_UNAVAILABLE",
  "REFRESH_FAILED", "IN_MEMORY_STATE_UNAVAILABLE", "WORK_SESSION_MISMATCH", "SESSION_MIGRATION_PENDING", "AUTH_RETRY_EXHAUSTED", "OTHER"
] as const;
export type BackgroundAuthReason = typeof backgroundAuthReasons[number];
export class BackgroundSessionReadError extends Error {
  constructor(readonly diagnosticReason: BackgroundAuthReason) {
    super("Secure session read unavailable"); this.name = "BackgroundSessionReadError";
  }
}
// Preserve SecureStore defaults and shared logout semantics. Tag only storage reads;
// never copy secrets/errors into diagnostics, or classify an arbitrary throw as logout.
export function diagnosedSessionStorage<T extends {
  getItemAsync(key: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }): Promise<void>;
  deleteItemAsync(key: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }): Promise<void>;
}>(storage: T, observe: (reason: BackgroundAuthReason) => void = () => undefined) {
  const notify = (reason: BackgroundAuthReason) => { try { observe(reason); } catch { /* Evidence cannot change auth decisions. */ } };
  return {
    getItemAsync: async (key: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }) => {
      try {
        const raw = await storage.getItemAsync(key, options);
        if (raw === null) notify("SECURESTORE_RETURNED_NULL");
        // Diagnostic hints only: shared session validation remains authoritative.
        if (raw && (key === "karigo_captain_session_v2" || key === "karigo_captain_session_v3")) {
          try {
            const envelope = JSON.parse(raw);
            if (envelope && typeof envelope.accessToken === "string" && !envelope.refreshToken) notify("REFRESH_TOKEN_UNAVAILABLE");
          } catch { /* Shared resolver reports TOKEN_PARSE_FAILURE; never expose raw input. */ }
        }
        return raw;
      }
      catch (error) {
        const e = error as { code?: unknown; protectedDataAvailable?: unknown; message?: unknown } | null;
        // Interaction-not-allowed does not itself establish that the screen is locked.
        const reason = e?.protectedDataAvailable === false ? "SECURESTORE_PROTECTED_DATA_UNAVAILABLE"
          : e?.code === -25308 || e?.code === "errSecInteractionNotAllowed" || (typeof e?.message === "string" && e.message.includes("User interaction is not allowed.")) ? "SECURESTORE_INTERACTION_NOT_ALLOWED"
          : "SECURESTORE_READ_ERROR";
        throw new BackgroundSessionReadError(reason);
      }
    },
    setItemAsync: (key: string, value: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }) => storage.setItemAsync(key, value, options),
    deleteItemAsync: (key: string, options?: { keychainAccessible?: number; requireAuthentication?: boolean }) => storage.deleteItemAsync(key, options)
  };
}
export function backgroundSessionFailure(error: unknown): BackgroundAuthReason {
  if (error instanceof BackgroundSessionReadError) return error.diagnosticReason === "SECURESTORE_INTERACTION_NOT_ALLOWED" ? "SECURESTORE_PROTECTED_DATA_UNAVAILABLE" : error.diagnosticReason;
  const e = error as { name?: unknown; code?: unknown; errorCode?: unknown } | null;
  // Only fixed recognized evidence codes, never arbitrary strings or inferred lock state.
  const code = e?.errorCode ?? e?.code;
  if (typeof code === "string" && backgroundAuthReasons.includes(code as BackgroundAuthReason)) return code as BackgroundAuthReason;
  if (e?.name === "SessionMigrationPendingError") return "SESSION_MIGRATION_PENDING";
  if (e?.name === "SessionCorruptionError") return "TOKEN_PARSE_FAILURE";
  if (e?.name === "SessionTemporarilyUnavailableError") return "REFRESH_FAILED";
  return "OTHER";
}
export async function readBackgroundSession<T>(store: { readSession(): Promise<T | null>; readBackgroundSession?(): Promise<T | null> },
  emit: (fields: { sessionAvailable: boolean; reason?: BackgroundAuthReason }) => Promise<unknown>) {
  try {
    const session = await (store.readBackgroundSession ? store.readBackgroundSession() : store.readSession());
    await emit(session ? { sessionAvailable: true } : { sessionAvailable: false, reason: "SESSION_NOT_PERSISTED" });
    return session;
  } catch (error) {
    await emit({ sessionAvailable: false, reason: backgroundSessionFailure(error) });
    throw error;
  }
}
