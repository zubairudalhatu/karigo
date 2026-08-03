import * as Location from "expo-location";

export type CaptainLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export const CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE = "We could not confirm your current location. Turn on device location and try again.";

export async function requestCaptainForegroundLocation(strongAccuracy = false): Promise<CaptainLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: strongAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy
  };
}

export async function watchCaptainForegroundLocation(
  onLocation: (location: CaptainLocation) => void,
  strongAccuracy = false
) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(CAPTAIN_LOCATION_UNAVAILABLE_MESSAGE);
  }
  return Location.watchPositionAsync({
    accuracy: strongAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
    timeInterval: 30_000,
    distanceInterval: strongAccuracy ? 15 : 20
  }, (position) => {
    onLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy
    });
  });
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
