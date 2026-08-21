import * as Location from "expo-location";

export type CaptainLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  isApproximate?: boolean;
  recordedAt: string;
  speedMetersPerSecond?: number | null;
  headingDegrees?: number | null;
};

export type CaptainOperationalLocationPayload = Pick<CaptainLocation, "latitude" | "longitude" | "accuracyMeters">;

export function toOperationalLocationPayload(location: CaptainLocation): CaptainOperationalLocationPayload {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters
  };
}

export type CaptainLocationErrorCode = "PERMISSION_DENIED" | "PRECISE_REQUIRED" | "SERVICES_DISABLED" | "ACQUISITION_TIMEOUT" | "UNAVAILABLE";

const APPROXIMATE_ACCURACY_METERS = 250;
const LOCATION_TIMEOUT_MS = 12_000;
let foregroundPermissionPrompted = false;

export const CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE = "We could not confirm your current location. Turn on location and try again.";

export class CaptainLocationError extends Error {
  constructor(public readonly code: CaptainLocationErrorCode, message: string) {
    super(message);
    this.name = "CaptainLocationError";
  }
}

async function ensureForegroundLocationAccess() {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && !foregroundPermissionPrompted) {
    foregroundPermissionPrompted = true;
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (!permission.granted) throw new CaptainLocationError("PERMISSION_DENIED", "Turn on location permission to see where you are.");
  if (!await Location.hasServicesEnabledAsync()) throw new CaptainLocationError("SERVICES_DISABLED", "Turn on device location to see where you are.");
}

function captainLocationFromPosition(position: Location.LocationObject): CaptainLocation {
  const accuracyMeters = position.coords.accuracy;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters,
    isApproximate: accuracyMeters !== null && accuracyMeters > APPROXIMATE_ACCURACY_METERS,
    recordedAt: new Date(position.timestamp).toISOString(),
    speedMetersPerSecond: position.coords.speed,
    headingDegrees: position.coords.heading
  };
}

function withLocationTimeout<T>(promise: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CaptainLocationError("ACQUISITION_TIMEOUT", "Location is taking longer than expected. Try again in a moment.")), LOCATION_TIMEOUT_MS);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (cause) => {
      clearTimeout(timer);
      reject(cause);
    });
  });
}

export async function requestCaptainForegroundLocation(strongAccuracy = false): Promise<CaptainLocation> {
  await ensureForegroundLocationAccess();
  try {
    const position = await withLocationTimeout(Location.getCurrentPositionAsync({ accuracy: strongAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced }));
    const location = captainLocationFromPosition(position);
    if (strongAccuracy && location.isApproximate) throw new CaptainLocationError("PRECISE_REQUIRED", "Allow precise location to go online for Ride and Delivery work.");
    return location;
  } catch (cause) {
    if (cause instanceof CaptainLocationError) throw cause;
    throw new CaptainLocationError("UNAVAILABLE", CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }
}

export async function watchCaptainForegroundLocation(onLocation: (location: CaptainLocation) => void, strongAccuracy = false) {
  await ensureForegroundLocationAccess();
  try {
    return await Location.watchPositionAsync({
      accuracy: strongAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
      timeInterval: 30_000,
      distanceInterval: strongAccuracy ? 15 : 25
    }, (position) => onLocation(captainLocationFromPosition(position)));
  } catch {
    throw new CaptainLocationError("UNAVAILABLE", CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }
}

export function captainLocationErrorMessage(cause: unknown) {
  return cause instanceof CaptainLocationError ? cause.message : CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE;
}

export function distanceMeters(a: CaptainLocation, b: CaptainLocation) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const deltaLat = (b.latitude - a.latitude) * Math.PI / 180;
  const deltaLng = (b.longitude - a.longitude) * Math.PI / 180;
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
