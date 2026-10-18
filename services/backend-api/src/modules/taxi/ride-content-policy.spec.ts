import { BadRequestException } from "@nestjs/common";
import { googleLocationDisposal, googleLocationExpiry, googleLocationProof, GOOGLE_LOCATION_LIFETIME_MS } from "./ride-content-policy";

describe("Ride Google content boundary", () => {
  const now = new Date("2026-10-18T10:00:00.000Z");
  const secret = "synthetic-integrity-test-only";
  const proof = () => googleLocationProof("synthetic-user", 9.1, 7.2, secret, now);
  it("anchors disposal at acquisition plus 22 days (including the separate seven-day PITR allowance), not at later booking", () => {
    expect(googleLocationExpiry(proof(), "synthetic-user", 9.1, 7.2, secret, new Date(+now + 60000)))
      .toEqual(new Date(+now + GOOGLE_LOCATION_LIFETIME_MS));
  });
  it.each([
    ["different-user", 9.1, 7.2, secret, now],
    ["synthetic-user", 9.2, 7.2, secret, now],
    ["synthetic-user", 9.1, 7.3, secret, now],
    ["synthetic-user", 9.1, 7.2, "wrong-key", now],
    ["synthetic-user", 9.1, 7.2, secret, new Date(+now + 1800001)],
    ["synthetic-user", 9.1, 7.2, secret, new Date(+now - 1)]
  ])("rejects changed subject/coordinates/signature or expired acquisition proof", (subject, lat, lng, key, at) => {
    expect(() => googleLocationExpiry(proof(), subject as string, lat as number, lng as number, key as string, at as Date)).toThrow(BadRequestException);
  });
  it.each([undefined, "malformed", "a.b.c"])("fails closed for missing/malformed evidence", (value) => {
    expect(() => googleLocationExpiry(value, "synthetic-user", 9.1, 7.2, secret, now)).toThrow(BadRequestException);
  });
  it("minimizes Google coordinates at terminal state or expiry, never user/unknown locations", () => {
    expect(googleLocationDisposal("GOOGLE_DERIVED", new Date(+now + 1000), now)).toBe(false);
    expect(googleLocationDisposal("GOOGLE_DERIVED", now, now)).toBe(true);
    expect(googleLocationDisposal("GOOGLE_DERIVED", null, now)).toBe(true);
    expect(googleLocationDisposal("GOOGLE_DERIVED", new Date(+now + 1000), now, true)).toBe(true);
    expect(googleLocationDisposal("USER_SUPPLIED", now, now, true)).toBe(false);
    expect(googleLocationDisposal("LEGACY_UNKNOWN", now, now, true)).toBe(false);
  });
});
