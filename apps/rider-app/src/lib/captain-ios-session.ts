import { SessionCorruptionError, SessionPersistenceError, StaleAuthOperationError } from "@karigo/config";
import type { AuthSessionEnvelopeV2, VersionedAuthSessionStore } from "@karigo/config";

export const CAPTAIN_SESSION_V3 = "karigo_captain_session_v3";
export const CAPTAIN_SESSION_V2 = "karigo_captain_session_v2";
export const CAPTAIN_SESSION_FENCE = "karigo_captain_session_fence_v3";
const OLD_KEYS = [CAPTAIN_SESSION_V2, "karigo_rider_access_token", "karigo_rider_refresh_token"];
export type SessionStorageOptions = { keychainAccessible?: number; requireAuthentication?: boolean };
export interface CaptainSecureStorage {
  getItemAsync(key: string, options?: SessionStorageOptions): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: SessionStorageOptions): Promise<void>;
  deleteItemAsync(key: string, options?: SessionStorageOptions): Promise<void>;
}
export class SessionMigrationPendingError extends Error {
  constructor() { super("Foreground session migration required"); this.name = "SessionMigrationPendingError"; }
}
type Revision = { fence: string | null; key: string; raw: string };
type Options = { storage: CaptainSecureStorage; afterFirstUnlock: number; isForeground(): boolean;
  verifyLegacyAccess(accessToken: string): Promise<string> };
export interface CaptainIosSessionStore extends VersionedAuthSessionStore {
  readBackgroundSession(): Promise<AuthSessionEnvelopeV2 | null>;
  migrateForegroundSession(expectedUserId: string): Promise<void>;
  persistRefreshedPair(previous: AuthSessionEnvelopeV2, access: string, refresh: string, generation?: number): Promise<AuthSessionEnvelopeV2>;
}
function parse(raw: string): AuthSessionEnvelopeV2 {
  try {
    const s = JSON.parse(raw);
    if (s?.schemaVersion !== 2 || typeof s.accessToken !== "string" || !s.accessToken.trim() ||
      typeof s.refreshToken !== "string" || !s.refreshToken.trim() || typeof s.savedAt !== "string" || !Number.isFinite(Date.parse(s.savedAt)) ||
      !Number.isInteger(s.sessionGeneration) || s.sessionGeneration < 0) throw Error();
    return s;
  } catch { throw new SessionCorruptionError("Saved Captain session is invalid."); }
}
// An additional expiry rejection, never signature validation or authorization.
// The backend must authenticate the exact legacy token before migration.
function unexpired(access: string) {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const part = access.split("."); if (part.length !== 3) return false;
    let bits = 0, value = 0, decoded = "";
    for (const c of part[1].replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "")) {
      const n = chars.indexOf(c); if (n < 0) return false;
      value = (value << 6) | n; bits += 6;
      if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((value >> bits) & 255); }
    }
    const exp = JSON.parse(decoded).exp;
    return typeof exp === "number" && Number.isFinite(exp) && exp * 1000 > Date.now();
  } catch { return false; }
}
export function createCaptainIosSessionStore(o: Options): CaptainIosSessionStore {
  const policy = { keychainAccessible: o.afterFirstUnlock, requireAuthentication: false };
  const get = (key: string) => o.storage.getItemAsync(key, key === CAPTAIN_SESSION_V3 || key === CAPTAIN_SESSION_FENCE ? policy : undefined);
  const remove = (key: string) => o.storage.deleteItemAsync(key, key === CAPTAIN_SESSION_V3 ? policy : undefined);
  // The only writer: new v3 items and the non-credential logout fence use AFU.
  const put = (key: typeof CAPTAIN_SESSION_V3 | typeof CAPTAIN_SESSION_FENCE, value: string) => o.storage.setItemAsync(key, value, policy);
  let generation = 0, invalidations = 0, loginIntent = -1, blocked = false, queue: Promise<unknown> = Promise.resolve();
  const revisions = new WeakMap<AuthSessionEnvelopeV2, Revision>();
  const serial = <T>(fn: () => Promise<T>) => { const p = queue.then(fn, fn); queue = p.catch(() => undefined); return p; };
  const isCurrent = (g?: number) => g === undefined || g === generation;
  const check = (g: number) => { if (!isCurrent(g)) throw new StaleAuthOperationError(); };
  const nonce = (state: string) => `${state}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  async function deleteOld() { for (const key of OLD_KEYS) await remove(key); }
  async function invalidate() {
    ++invalidations; loginIntent = -1; blocked = true;
    const fenceResult = await Promise.allSettled([put(CAPTAIN_SESSION_FENCE, nonce("blocked"))]);
    const results = [...fenceResult, ...await Promise.allSettled([CAPTAIN_SESSION_V3, ...OLD_KEYS].map(remove))];
    if (results.some(r => r.status === "rejected")) throw new SessionPersistenceError("Captain credentials could not be fully cleared.");
  }
  async function read(background: boolean) {
    if (blocked) return null;
    const fence = await get(CAPTAIN_SESSION_FENCE);
    if (fence?.startsWith("blocked:")) return null;
    let key = CAPTAIN_SESSION_V3, raw = fence?.startsWith("active:") ? await get(key) : null;
    if (!raw) {
      if (fence?.startsWith("active:")) { await invalidate(); throw new SessionCorruptionError("Saved Captain session is incomplete."); }
      if (background || !o.isForeground()) throw new SessionMigrationPendingError();
      key = CAPTAIN_SESSION_V2; raw = await get(key);
      if (!raw) {
        const access = await get(OLD_KEYS[1]), refresh = await get(OLD_KEYS[2]);
        if (!access && !refresh) return null;
        if (!access || !refresh) { await invalidate(); throw new SessionCorruptionError("Saved Captain session is incomplete."); }
        // Legacy split keys are inspected only in foreground, never rewritten as v2.
        raw = JSON.stringify({ schemaVersion: 2, accessToken: access, refreshToken: refresh, savedAt: new Date().toISOString(), sessionGeneration: generation });
        key = OLD_KEYS[1];
      }
    }
    let session: AuthSessionEnvelopeV2;
    try { session = parse(raw); } catch (e) { await invalidate(); throw e; }
    if (await get(CAPTAIN_SESSION_FENCE) !== fence) throw new StaleAuthOperationError();
    if (blocked) return null;
    revisions.set(session, { fence, key, raw }); return session;
  }
  async function assertRevision(r: Revision, g: number) {
    check(g); if (blocked) throw new StaleAuthOperationError();
    if (await get(CAPTAIN_SESSION_FENCE) !== r.fence) throw new StaleAuthOperationError();
    const current = await get(r.key);
    const same = r.key === OLD_KEYS[1] ? current === parse(r.raw).accessToken : current === r.raw;
    if (!same) throw new StaleAuthOperationError();
    check(g);
  }
  async function writeVerified(raw: string, g: number, revision?: Revision, foregroundOnly = false) {
    const epoch = invalidations;
    const ensure = () => { check(g); if (invalidations !== epoch) throw new StaleAuthOperationError(); if (foregroundOnly && !o.isForeground()) throw new SessionMigrationPendingError(); };
    ensure();
    if (revision) await assertRevision(revision, g);
    else if (loginIntent !== g) throw new StaleAuthOperationError();
    const claim = nonce("pending");
    try {
      await put(CAPTAIN_SESSION_FENCE, claim); ensure();
      if (await get(CAPTAIN_SESSION_FENCE) !== claim) throw new StaleAuthOperationError();
      await put(CAPTAIN_SESSION_V3, raw); ensure();
      const verified = await get(CAPTAIN_SESSION_V3); ensure();
      if (verified !== raw) throw new SessionPersistenceError("Captain session verification failed.");
      parse(verified);
      if (await get(CAPTAIN_SESSION_FENCE) !== claim) throw new StaleAuthOperationError();
      if (revision && revision.key !== CAPTAIN_SESSION_V3) {
        const old = await get(revision.key);
        if (old !== (revision.key === OLD_KEYS[1] ? parse(revision.raw).accessToken : revision.raw)) throw new StaleAuthOperationError();
      }
      // Only a verified v3 copy permits deleting v2 and legacy credentials.
      await deleteOld(); ensure();
      if (await get(CAPTAIN_SESSION_FENCE) !== claim) throw new StaleAuthOperationError();
      await put(CAPTAIN_SESSION_FENCE, nonce("active")); ensure();
      blocked = false; loginIntent = -1;
      return parse(raw);
    } catch (e) {
      // A failed write/verification never leaves an unverified v3 preferred over v2.
      if (await get(CAPTAIN_SESSION_FENCE).catch(() => null) === claim && await get(CAPTAIN_SESSION_V3).catch(() => null) === raw) await remove(CAPTAIN_SESSION_V3).catch(() => undefined);
      if (e instanceof StaleAuthOperationError || e instanceof SessionPersistenceError) throw e;
      throw new SessionPersistenceError("Captain session could not be saved securely.");
    }
  }
  function persist(access: string, refresh: string, g: number, revision?: Revision) {
    if (!access?.trim() || !refresh?.trim() || !unexpired(access)) throw new SessionPersistenceError("Captain received an invalid or expired session.");
    return writeVerified(JSON.stringify({ schemaVersion: 2, accessToken: access, refreshToken: refresh, savedAt: new Date().toISOString(), sessionGeneration: g }), g, revision);
  }
  const store: CaptainIosSessionStore = {
    sessionKey: CAPTAIN_SESSION_V3,
    currentGeneration: () => generation, beginOperation: () => generation,
    beginNewSession: () => { loginIntent = ++generation; return generation; }, isCurrent,
    readSession: () => serial(() => read(false)), readBackgroundSession: () => serial(() => read(true)),
    persistTokenPair: (a, r, g = generation) => serial(() => persist(a, r, g)),
    persistRefreshedPair: (previous, a, r, g = generation) => serial(() => {
      const revision = revisions.get(previous); if (!revision) throw new StaleAuthOperationError();
      return persist(a, r, g, revision);
    }),
    clearSession: (g = generation) => { if (isCurrent(g)) { ++invalidations; loginIntent = -1; blocked = true; } return serial(async () => { if (isCurrent(g)) await invalidate(); }); },
    resetSavedLogin: () => { ++generation; ++invalidations; loginIntent = -1; blocked = true; return serial(invalidate); },
    migrateForegroundSession: expectedUserId => serial(async () => {
      const g = generation; check(g);
      if (!o.isForeground()) throw new SessionMigrationPendingError();
      const session = await read(false); check(g);
      if (!session) throw new SessionCorruptionError("No saved Captain session.");
      const revision = revisions.get(session)!;
      if (revision.key === CAPTAIN_SESSION_V3) return;
      if (!unexpired(session.accessToken)) { await invalidate(); throw new SessionCorruptionError("Legacy Captain session has expired."); }
      const userId = await o.verifyLegacyAccess(session.accessToken); check(g);
      if (!userId || userId !== expectedUserId) { await invalidate(); throw new SessionCorruptionError("Legacy Captain session was rejected."); }
      if (!o.isForeground()) throw new SessionMigrationPendingError();
      if (!unexpired(session.accessToken)) { await invalidate(); throw new SessionCorruptionError("Legacy Captain session has expired."); }
      await writeVerified(revision.raw, g, revision, true);
    }),
    tokenStore: { getToken: async () => (await store.readSession())?.accessToken ?? null,
      setToken: async a => { const s = await store.readSession(); if (!s) throw new SessionPersistenceError("Missing session."); await store.persistRefreshedPair(s, a, s.refreshToken); }, clearToken: () => store.clearSession() },
    refreshTokenStore: { getToken: async () => (await store.readSession())?.refreshToken ?? null,
      setToken: async r => { const s = await store.readSession(); if (!s) throw new SessionPersistenceError("Missing session."); await store.persistRefreshedPair(s, s.accessToken, r); }, clearToken: () => store.clearSession() }
  };
  return store;
}
