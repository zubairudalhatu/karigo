import * as SecureStore from "expo-secure-store";
// Accepted-work buffer / sanitized QA evidence only. Auth-token storage is unchanged.
const STORAGE_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const readSecure = (key: string) => SecureStore.getItemAsync(key, STORAGE_OPTIONS);
const writeSecure = (key: string, value: string) => SecureStore.setItemAsync(key, value, STORAGE_OPTIONS);
const deleteSecure = (key: string) => SecureStore.deleteItemAsync(key, STORAGE_OPTIONS);

export const LOCATION_QA_DIAGNOSTICS_AVAILABLE = process.env.EXPO_PUBLIC_CAPTAIN_LOCATION_QA_DIAGNOSTICS === "true";
const META = "karigo.locationQa.meta.v1";
const LIMIT = 48;
const TTL = 30 * 60_000;
let queue: Promise<unknown> = Promise.resolve();
const events = ["DEFINED", "START_REQUEST", "NATIVE_STATE", "PERMISSION", "STARTED", "CALLBACK", "AUTH", "WORK", "FILTER", "BUFFER", "UPLOAD", "STOP", "FAILURE"] as const;
const reasons = ["OK", "NO_SESSION", "NO_SCOPE", "NO_WORK", "WORK_CHANGED", "SESSION_CHANGED", "NO_LOCATIONS", "INVALID_OR_OLD_SAMPLE", "PERMISSION_DENIED", "CONSENT_DECLINED", "TASK_ERROR", "STORAGE_ERROR", "NETWORK", "TIMEOUT", "HTTP", "UNKNOWN"] as const;
type Reason = typeof reasons[number];
type Event = typeof events[number];
export type LocationDiagnostic = {
  at: string; event: Event; reason?: Reason; workRef?: string;
  defined?: boolean; registered?: boolean; started?: boolean; optionsMatch?: boolean;
  foregroundGranted?: boolean; backgroundGranted?: boolean; appForeground?: boolean;
  stateAvailable?: boolean; sessionAvailable?: boolean; accepted?: boolean; uploadAttempted?: boolean;
  locationCount?: number; bufferedCount?: number; httpStatus?: number; nativeErrorCode?: number;
  accuracy?: number; activityType?: number; distanceInterval?: number; deferredUpdatesDistance?: number;
  deferredUpdatesInterval?: number; pausesUpdatesAutomatically?: boolean; showsBackgroundLocationIndicator?: boolean;
};
type Meta = { expiresAt: number; next: number; count: number };
function serial<T>(fn: () => Promise<T>): Promise<T> { const p = queue.then(fn, fn); queue = p.catch(() => undefined); return p; }
async function clear() {
  await deleteSecure(META);
  for (let i=0;i<LIMIT;i++) await deleteSecure(`${META}.${i}`);
}
async function meta(): Promise<Meta | null> {
  if (!LOCATION_QA_DIAGNOSTICS_AVAILABLE) return null;
  try {
    const raw = await readSecure(META), m = raw ? JSON.parse(raw) : null;
    if (!m) return null;
    if (!Number.isFinite(m.expiresAt) || m.expiresAt <= Date.now() || m.expiresAt > Date.now()+TTL || !Number.isInteger(m.next) || m.next<0 || m.next>=LIMIT || !Number.isInteger(m.count) || m.count<0 || m.count>LIMIT) { await clear(); return null; }
    return m;
  } catch { return null; }
}
export function armLocationQaDiagnostics() {
  return serial(async () => {
    if (!LOCATION_QA_DIAGNOSTICS_AVAILABLE) return false;
    await clear(); await writeSecure(META, JSON.stringify({ expiresAt: Date.now()+TTL, next:0, count:0 })); return true;
  });
}
export function clearLocationQaDiagnostics() { return serial(clear); }
// Runtime allowlist: raw error text, tokens, UUIDs and coordinates cannot enter the ring.
function safe(input: LocationDiagnostic): LocationDiagnostic {
  const out = { at: new Date().toISOString(), event: events.includes(input.event) ? input.event : "FAILURE" } as LocationDiagnostic;
  if (input.reason && reasons.includes(input.reason)) out.reason=input.reason;
  if (input.workRef && /^[a-z0-9]{8,20}_[a-z0-9]{8,20}$/.test(input.workRef)) out.workRef=input.workRef;
  const bools = ["defined","registered","started","optionsMatch","foregroundGranted","backgroundGranted","appForeground","stateAvailable","sessionAvailable","accepted","uploadAttempted","pausesUpdatesAutomatically","showsBackgroundLocationIndicator"] as const;
  for (const k of bools) if (typeof input[k] === "boolean") Object.assign(out,{[k]:input[k]});
  const nums = ["locationCount","bufferedCount","httpStatus","nativeErrorCode","accuracy","activityType","distanceInterval","deferredUpdatesDistance","deferredUpdatesInterval"] as const;
  for (const k of nums) {
    const value=input[k];
    if (typeof value === "number" && Number.isFinite(value) && value>=0 && value<=100_000) Object.assign(out,{[k]:value});
  }
  return out;
}
export function locationDiagnostic(event: Event, fields: Omit<Partial<LocationDiagnostic>,"event"|"at"> = {}) {
  return serial(async () => {
    const m=await meta(); if (!m) return;
    await writeSecure(`${META}.${m.next}`,JSON.stringify(safe({ ...fields, event, at:"" })));
    m.next=(m.next+1)%LIMIT; m.count=Math.min(LIMIT,m.count+1); await writeSecure(META,JSON.stringify(m));
  }).catch(() => undefined); // QA evidence must never determine operational authorization.
}
export function readLocationQaDiagnostics() {
  return serial(async () => {
    const m=await meta(); if (!m) return [];
    const rows: LocationDiagnostic[]=[];
    for(let i=0;i<m.count;i++) {
      const raw=await readSecure(`${META}.${(m.next-m.count+i+LIMIT)%LIMIT}`);
      try { if(raw) { const r=JSON.parse(raw); const cleaned=safe(r); cleaned.at=Number.isFinite(Date.parse(r.at))?new Date(r.at).toISOString():""; rows.push(cleaned); } } catch { /* ignore corrupt QA entries */ }
    }
    return rows;
  });
}
export function diagnosticFailure(error: unknown): { reason: Reason; httpStatus?: number } {
  const e=error as { name?: string; status?: number } | null;
  if (typeof e?.status === "number" && e.status>=100 && e.status<=599) return { reason:"HTTP", httpStatus:e.status };
  if (e?.name === "ApiTimeoutError" || e?.name === "AbortError") return { reason:"TIMEOUT" };
  if (e?.name === "ApiNetworkError") return { reason:"NETWORK" };
  return { reason:"UNKNOWN" };
}

// A later non-QA release also removes any prior opted-in evidence at startup.
if (!LOCATION_QA_DIAGNOSTICS_AVAILABLE) void clearLocationQaDiagnostics().catch(() => undefined);
