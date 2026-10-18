import { BadRequestException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

export type RideLocationSource = "USER_SUPPLIED" | "GOOGLE_DERIVED" | "LEGACY_UNKNOWN";
// 22 days online + verified 7-day Render PITR + 1-day safety margin stays within Google's 30-day cap.
export const GOOGLE_LOCATION_LIFETIME_MS = 22 * 24 * 60 * 60 * 1000;
export const GOOGLE_LOCATION_PROOF_LIFETIME_MS = 30 * 60 * 1000;
export const REMOVED_GOOGLE_LOCATION = "Selected location (details not retained)";

// This is a purpose-separated integrity receipt, not an authentication token.
function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`karigo:ride-location:v1:${payload}`).digest("base64url");
}

export function googleLocationProof(subject: string, latitude: number, longitude: number, secret: string, now = new Date()) {
  if (!secret) throw new BadRequestException("Location verification unavailable");
  const payload = Buffer.from(JSON.stringify({ subject, latitude, longitude, obtainedAt: now.toISOString() })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function googleLocationExpiry(proof: string | undefined, subject: string, latitude: number | undefined, longitude: number | undefined, secret: string, now = new Date()) {
  try {
    if (!secret || !proof || proof.length > 2048) throw new Error();
    const [payload, mac, extra] = proof.split(".");
    const expected = signature(payload, secret);
    if (extra || !mac || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    const obtainedAt = new Date(data.obtainedAt).getTime();
    const age = now.getTime() - obtainedAt;
    if (data.subject !== subject || data.latitude !== latitude || data.longitude !== longitude || !Number.isFinite(age) || age < 0 || age > GOOGLE_LOCATION_PROOF_LIFETIME_MS) throw new Error();
    return new Date(obtainedAt + GOOGLE_LOCATION_LIFETIME_MS);
  } catch {
    throw new BadRequestException("Search for this location again before requesting a Ride");
  }
}

export function googleLocationDisposal(source: string, expiresAt: Date | null, now = new Date(), terminal = false) {
  return source === "GOOGLE_DERIVED" && (terminal || !expiresAt || expiresAt.getTime() <= now.getTime());
}
