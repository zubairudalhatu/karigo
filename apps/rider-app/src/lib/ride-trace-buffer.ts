import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
// Accepted-work buffer / sanitized QA evidence only. Auth-token storage is unchanged.
const STORAGE_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const readSecure = (key: string) => SecureStore.getItemAsync(key, STORAGE_OPTIONS);
const writeSecure = (key: string, value: string) => SecureStore.setItemAsync(key, value, STORAGE_OPTIONS);
const deleteSecure = (key: string) => SecureStore.deleteItemAsync(key, STORAGE_OPTIONS);
import { CaptainLocation, optionalLocationMetric } from "./location";
const LEGACY_KEY = "karigo.captain.rideTraceBuffer.v1";
const ACTIVE_KEY = "karigo.captain.traceScope.v2";
const MAX_BUFFERED_POINTS = 100;
const MAX_AGE_MS = 15 * 60_000;
let serial: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const result = serial.then(fn, fn); serial = result.catch(() => undefined); return result;
}
export interface RideTraceScope {
  captainUserId: string; workId: string; mode: "RIDE" | "DELIVERY"; epoch: string; startedAt: string;
}
export interface BufferedRideTracePoint {
  clientPointId: string; latitude: number; longitude: number;
  accuracyMeters?: number | null; speedMetersPerSecond?: number | null; headingDegrees?: number | null;
  recordedAt: string; source: "FOREGROUND" | "BACKGROUND" | "OFFLINE_BUFFER";
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validScope(x: RideTraceScope | null): x is RideTraceScope {
  return !!x && uuid.test(x.captainUserId) && uuid.test(x.workId) && (x.mode === "RIDE" || x.mode === "DELIVERY") &&
    /^[a-z0-9]{8,20}_[a-z0-9]{8,20}$/.test(x.epoch) && Number.isFinite(Date.parse(x.startedAt));
}
function key(s: RideTraceScope) { return `karigo.captain.trace.v2.${s.captainUserId}.${s.workId}.${s.epoch}`; }
export function sameTraceScope(a: RideTraceScope | null, b: RideTraceScope | null) {
  return !!a && !!b && a.captainUserId === b.captainUserId && a.workId === b.workId && a.mode === b.mode && a.epoch === b.epoch && a.startedAt === b.startedAt;
}
async function active(): Promise<RideTraceScope | null> {
  const raw = await readSecure(ACTIVE_KEY);
  try { const s = raw ? JSON.parse(raw) : null; return validScope(s) ? s : null; } catch { return null; }
}
export function readActiveWorkTraceScope() { return locked(active); }
export function beginWorkTraceScope(captainUserId: string, mode: "RIDE" | "DELIVERY", workId: string, reuse = false) {
  return locked(async () => {
    const old = await active();
    // Unscoped legacy samples cannot be attributed safely. Never migrate them.
    await deleteSecure(LEGACY_KEY);
    if (reuse && old?.captainUserId === captainUserId && old.workId === workId && old.mode === mode) return old;
    if (old) await deleteSecure(key(old));
    const scope: RideTraceScope = { captainUserId, mode, workId, startedAt: new Date().toISOString(),
      epoch: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2).padEnd(10, "0")}` };
    if (!validScope(scope)) throw new Error("TRACE_SCOPE_INVALID");
    await writeSecure(ACTIVE_KEY, JSON.stringify(scope)); return scope;
  });
}
export function clearActiveWorkTraceBuffer(expected?: RideTraceScope) {
  return locked(async () => {
    const current = await active();
    if (expected && !sameTraceScope(current, expected)) return;
    if (current) await deleteSecure(key(current));
    await deleteSecure(ACTIVE_KEY); await deleteSecure(LEGACY_KEY);
  });
}
function normalize(point: BufferedRideTracePoint): BufferedRideTracePoint {
  return { ...point, accuracyMeters: optionalLocationMetric(point.accuracyMeters, 5000),
    speedMetersPerSecond: optionalLocationMetric(point.speedMetersPerSecond, 150), headingDegrees: optionalLocationMetric(point.headingDegrees, 360) };
}
export function isTraceSampleInScope(point: Pick<BufferedRideTracePoint,"recordedAt"|"latitude"|"longitude">, scope: RideTraceScope) {
  const time = Date.parse(point.recordedAt), now = Date.now();
  return Number.isFinite(time) && time >= Date.parse(scope.startedAt) && time >= now - MAX_AGE_MS && time <= now + 30_000 &&
    Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
async function load(scope: RideTraceScope): Promise<BufferedRideTracePoint[]> {
  const raw = await readSecure(key(scope));
  try {
    const envelope = raw ? JSON.parse(raw) : null;
    if (!sameTraceScope(envelope?.scope, scope) || !Array.isArray(envelope.points)) return [];
    return envelope.points.filter((p: BufferedRideTracePoint) => isTraceSampleInScope(p, scope)).map(normalize);
  } catch { return []; }
}
async function save(scope: RideTraceScope, points: BufferedRideTracePoint[]) {
  if (!points.length) return deleteSecure(key(scope));
  await writeSecure(key(scope), JSON.stringify({ scope, points: points.slice(-MAX_BUFFERED_POINTS) }));
}
export function foregroundRideTracePoint(location: CaptainLocation): BufferedRideTracePoint {
  return normalize({ ...location, clientPointId: `${location.recordedAt}:${location.latitude.toFixed(6)}:${location.longitude.toFixed(6)}`, source: "FOREGROUND" });
}
export function bufferBackgroundRideTrace(scope: RideTraceScope, locations: Location.LocationObject[]) {
  return locked(async () => {
    if (!sameTraceScope(await active(), scope)) return [];
    const byId = new Map((await load(scope)).map(p => [p.clientPointId, p]));
    for (const sample of locations) {
      if (!Number.isFinite(sample.timestamp)) continue;
      const point = foregroundRideTracePoint({ latitude: sample.coords.latitude, longitude: sample.coords.longitude,
        recordedAt: new Date(sample.timestamp).toISOString(), accuracyMeters: sample.coords.accuracy,
        speedMetersPerSecond: sample.coords.speed, headingDegrees: sample.coords.heading });
      point.source = "BACKGROUND";
      if (isTraceSampleInScope(point, scope)) byId.set(point.clientPointId, point);
    }
    const points = [...byId.values()].sort((a,b) => a.recordedAt.localeCompare(b.recordedAt)).slice(-MAX_BUFFERED_POINTS);
    await save(scope, points); return points;
  });
}
export function acknowledgeRideTracePoints(scope: RideTraceScope, ids: string[]) {
  return locked(async () => {
    if (!sameTraceScope(await active(), scope)) return;
    const acknowledged = new Set(ids); await save(scope, (await load(scope)).filter(p => !acknowledged.has(p.clientPointId)));
  });
}
export function traceUploadContext(scope: RideTraceScope) {
  return { captainUserId: scope.captainUserId, workId: scope.workId, mode: scope.mode, epoch: scope.epoch, startedAt: scope.startedAt };
}
