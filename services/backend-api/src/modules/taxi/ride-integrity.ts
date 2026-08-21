export const MINIMUM_RIDE_FARE_KOBO = 190_000;
export const FREE_PICKUP_WAIT_SECONDS = 300;
export const WAITING_CHARGE_KOBO_PER_MINUTE = 500;

export function applyMinimumRideFare(fareKobo: number, minimumFareKobo = MINIMUM_RIDE_FARE_KOBO) {
  const rounded = Math.max(0, Math.round(fareKobo));
  return {
    rideFareKobo: Math.max(rounded, minimumFareKobo),
    minimumFareApplied: rounded < minimumFareKobo
  };
}

export function calculatePickupWaiting(
  arrivedAt: Date | null | undefined,
  stoppedAt: Date = new Date(),
  freeSeconds = FREE_PICKUP_WAIT_SECONDS,
  rateKoboPerMinute = WAITING_CHARGE_KOBO_PER_MINUTE
) {
  const totalWaitingSeconds = arrivedAt
    ? Math.max(0, Math.floor((stoppedAt.getTime() - arrivedAt.getTime()) / 1000))
    : 0;
  const freeWaitingSeconds = Math.min(totalWaitingSeconds, freeSeconds);
  const billableWaitingSeconds = Math.max(0, totalWaitingSeconds - freeSeconds);
  const waitingChargeKobo = Math.round((billableWaitingSeconds * rateKoboPerMinute) / 60);
  return {
    totalWaitingSeconds,
    freeWaitingSeconds,
    billableWaitingSeconds,
    freeWaitingRemainingSeconds: Math.max(0, freeSeconds - totalWaitingSeconds),
    waitingChargeKobo,
    rateKoboPerMinute,
    state: !arrivedAt ? "NOT_STARTED" as const
      : stoppedAt.getTime() < arrivedAt.getTime() + freeSeconds * 1000 ? "FREE" as const
        : "PAID" as const
  };
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusMeters = 6_371_000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function evaluateRideGeofence(input: {
  latitude: number;
  longitude: number;
  targetLatitude: number;
  targetLongitude: number;
  configuredRadiusMeters: number;
  accuracyMeters?: number | null;
}) {
  const measuredDistanceMeters = Math.round(distanceMeters(input.latitude, input.longitude, input.targetLatitude, input.targetLongitude));
  const allowedRadiusMeters = input.configuredRadiusMeters + Math.min(Math.max(input.accuracyMeters ?? 0, 0), 100);
  return { measuredDistanceMeters, allowedRadiusMeters, inside: measuredDistanceMeters <= allowedRadiusMeters };
}

export function traceDistanceKm(points: Array<{ latitude: number; longitude: number; recordedAt: Date }>) {
  const ordered = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  let metres = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const segment = distanceMeters(previous.latitude, previous.longitude, current.latitude, current.longitude);
    const elapsedSeconds = (current.recordedAt.getTime() - previous.recordedAt.getTime()) / 1000;
    if (elapsedSeconds > 0 && segment <= Math.max(1_000, elapsedSeconds * 70)) metres += segment;
  }
  return Number((metres / 1000).toFixed(2));
}
