import { BadRequestException } from "@nestjs/common";
import { CaptainReadinessDto } from "./dto/captain-readiness.dto";

// Existing Captain JS online-location reuse window and precise-location requirement.
export const CAPTAIN_READINESS_MAX_AGE_MS = 30_000;
export const CAPTAIN_READINESS_MAX_ACCURACY_METERS = 250;
export type TransientCaptainLocation = { latitude: number; longitude: number; recordedAt: Date; accuracyMeters: number };
export function validateReadinessLocation(input: CaptainReadinessDto, now = Date.now()):
  { location: TransientCaptainLocation | null; reason: string | null } {
  const lat = input.latitude, lng = input.longitude;
  if (lat == null && lng == null) return { location: null, reason: "LOCATION_UNKNOWN" };
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new BadRequestException("Valid foreground coordinates are required.");
  if (!input.recordedAt) return { location: null, reason: "LOCATION_TIMESTAMP_UNKNOWN" };
  const timestamp = Date.parse(input.recordedAt);
  if (!Number.isFinite(timestamp) || timestamp > now) return { location: null, reason: "LOCATION_TIMESTAMP_INVALID" };
  if (now - timestamp > CAPTAIN_READINESS_MAX_AGE_MS) return { location: null, reason: "LOCATION_STALE" };
  if (input.accuracyMeters == null) return { location: null, reason: "LOCATION_ACCURACY_UNKNOWN" };
  if (!Number.isFinite(input.accuracyMeters) || input.accuracyMeters < 0) throw new BadRequestException("Valid reported location accuracy is required.");
  if (input.accuracyMeters > CAPTAIN_READINESS_MAX_ACCURACY_METERS) return { location: null, reason: "PRECISE_LOCATION_REQUIRED" };
  return { location: { latitude: lat, longitude: lng, recordedAt: new Date(timestamp), accuracyMeters: input.accuracyMeters }, reason: null };
}
