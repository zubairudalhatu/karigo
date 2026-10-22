// Production keeps existing call sites inert: no persistence, native bridge, arm, read or clear API.
import { backgroundAuthReasons, backgroundSessionFailure } from "./background-session";
const reasons = [...backgroundAuthReasons, "OK", "NO_SESSION", "NO_SCOPE", "NO_WORK", "WORK_CHANGED", "SESSION_CHANGED", "NO_LOCATIONS", "INVALID_OR_OLD_SAMPLE", "PERMISSION_DENIED", "CONSENT_DECLINED", "TASK_ERROR", "STORAGE_ERROR", "NETWORK", "TIMEOUT", "HTTP", "UNKNOWN"] as const;
const events = ["DEFINED", "START_REQUEST", "NATIVE_STATE", "PERMISSION", "STARTED", "CALLBACK", "AUTH", "WORK", "FILTER", "BUFFER", "UPLOAD", "STOP", "FAILURE"] as const;
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
export async function locationDiagnostic(_event: Event, _fields: Omit<Partial<LocationDiagnostic>, "event" | "at"> = {}): Promise<void> {}
export function diagnosticFailure(error: unknown): { reason: Reason; httpStatus?: number } {
  const authReason = backgroundSessionFailure(error);
  if (authReason !== "OTHER") return { reason: authReason };
  const e=error as { name?: string; status?: number } | null;
  if (typeof e?.status === "number" && e.status>=100 && e.status<=599) return { reason:"HTTP", httpStatus:e.status };
  if (e?.name === "ApiTimeoutError" || e?.name === "AbortError") return { reason:"TIMEOUT" };
  if (e?.name === "ApiNetworkError") return { reason:"NETWORK" };
  return { reason:"UNKNOWN" };
}
