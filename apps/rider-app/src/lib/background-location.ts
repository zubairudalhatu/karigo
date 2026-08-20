import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { captainAccessApi } from "../api/captain-access.api";
import { toOperationalLocationPayload } from "./location";

export const CAPTAIN_BACKGROUND_LOCATION_TASK = "karigo-captain-active-work-location";

type BackgroundLocationData = {
  locations?: Location.LocationObject[];
};

TaskManager.defineTask<BackgroundLocationData>(CAPTAIN_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const latest = data.locations[data.locations.length - 1];
  if (!latest) return;
  await captainAccessApi.updateAvailability(toOperationalLocationPayload({
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    accuracyMeters: latest.coords.accuracy
  })).catch(() => undefined);
});

export async function enableActiveWorkBackgroundLocation() {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) return false;
  if (await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)) return true;

  await Location.startLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    activityType: Location.ActivityType.AutomotiveNavigation,
    distanceInterval: 50,
    deferredUpdatesDistance: 100,
    deferredUpdatesInterval: 60_000,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "KariGO Captain active Ride",
      notificationBody: "Location is updating while your assigned work is active.",
      notificationColor: "#E31E24"
    }
  });
  return true;
}

export async function disableActiveWorkBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK);
  }
}
