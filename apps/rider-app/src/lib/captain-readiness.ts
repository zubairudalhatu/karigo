import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import type { CaptainLocation } from "./location";

// Reuse the existing online-transition 30-second window; no persistence or traces.
export const CAPTAIN_READINESS_REUSE_MS = 30_000;
export function toTransientReadinessLocation(location: CaptainLocation) {
  return { latitude: location.latitude, longitude: location.longitude,
    recordedAt: location.recordedAt, accuracyMeters: location.accuracyMeters ?? null };
}
export function isReadinessCurrent(result: LaunchAvailabilityResponse | null, now = Date.now()) {
  const until = result?.readiness?.validUntil;
  return Boolean(until && Number.isFinite(Date.parse(until)) && Date.parse(until) > now);
}
export function preferReadinessResult(current: LaunchAvailabilityResponse | null, incoming: LaunchAvailabilityResponse) {
  // A slower city-only GET must not erase an already verified transient fix.
  if (!incoming.readiness && isReadinessCurrent(current)) return current;
  if (isReadinessCurrent(current) && incoming.readiness &&
    Date.parse(current!.readiness!.capturedAt!) > Date.parse(incoming.readiness.capturedAt ?? "")) return current;
  return incoming;
}
