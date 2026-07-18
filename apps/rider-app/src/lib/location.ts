import * as Location from "expo-location";

export type CaptainLocation = {
  latitude: number;
  longitude: number;
};

export async function requestCaptainForegroundLocation(): Promise<CaptainLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow location access while online so KariGO Dispatch can coordinate pickups and deliveries.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
}
