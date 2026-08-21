import { applyMinimumRideFare, calculatePickupWaiting, distanceMeters, evaluateRideGeofence, traceDistanceKm } from "./ride-integrity";

describe("Task 209B H10 Ride integrity policy", () => {
  it("applies the NGN 1,900 minimum before confirmation", () => {
    expect(applyMinimumRideFare(120_000)).toEqual({ rideFareKobo: 190_000, minimumFareApplied: true });
    expect(applyMinimumRideFare(250_000)).toEqual({ rideFareKobo: 250_000, minimumFareApplied: false });
  });

  it("keeps five pickup minutes free and bills paid waiting proportionally", () => {
    const arrived = new Date("2026-08-21T10:00:00.000Z");
    expect(calculatePickupWaiting(arrived, new Date("2026-08-21T10:05:00.000Z"))).toMatchObject({ billableWaitingSeconds: 0, waitingChargeKobo: 0 });
    expect(calculatePickupWaiting(arrived, new Date("2026-08-21T10:05:30.000Z"))).toMatchObject({ billableWaitingSeconds: 30, waitingChargeKobo: 250 });
    expect(calculatePickupWaiting(arrived, new Date("2026-08-21T10:06:00.000Z"))).toMatchObject({ billableWaitingSeconds: 60, waitingChargeKobo: 500 });
  });

  it("measures geofence and ordered trace evidence", () => {
    expect(distanceMeters(9.0765, 7.3986, 9.0765, 7.3986)).toBe(0);
    expect(evaluateRideGeofence({
      latitude: 9.0765, longitude: 7.3986, targetLatitude: 9.0765, targetLongitude: 7.3986, configuredRadiusMeters: 250, accuracyMeters: 20
    })).toMatchObject({ inside: true, allowedRadiusMeters: 270 });
    expect(evaluateRideGeofence({
      latitude: 9.0865, longitude: 7.3986, targetLatitude: 9.0765, targetLongitude: 7.3986, configuredRadiusMeters: 250, accuracyMeters: 20
    })).toMatchObject({ inside: false, allowedRadiusMeters: 270 });
    const distance = traceDistanceKm([
      { latitude: 9.0765, longitude: 7.3986, recordedAt: new Date("2026-08-21T10:00:00Z") },
      { latitude: 9.0775, longitude: 7.3986, recordedAt: new Date("2026-08-21T10:00:30Z") }
    ]);
    expect(distance).toBeGreaterThan(0.1);
    expect(distance).toBeLessThan(0.2);
  });
  it("rejects implausible GPS jumps from actual-distance evidence", () => {
    expect(traceDistanceKm([
      { latitude: 9.0765, longitude: 7.3986, recordedAt: new Date("2026-08-21T10:00:00Z") },
      { latitude: 10.3158, longitude: 9.8442, recordedAt: new Date("2026-08-21T10:00:05Z") }
    ])).toBe(0);
  });
});
