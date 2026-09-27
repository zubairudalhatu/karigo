import { Alert, AppState } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { captainAccessApi, type CaptainWorkState } from "../api/captain-access.api";
import { toOperationalLocationPayload } from "./location";
import { acknowledgeRideTracePoints, bufferBackgroundRideTrace } from "./ride-trace-buffer";

export const CAPTAIN_BACKGROUND_LOCATION_TASK = "karigo-captain-active-work-location";
export const ACTIVE_WORK_LOCATION_DISCLOSURE = "KariGO Captain collects your location while the app is minimized or not in use during an accepted Ride or Delivery assignment. This enables live trip or delivery tracking and safety. Background tracking stops when your active assignment ends. Your location is not used for advertising. Choose Continue to allow background location, or Not now to keep working with the app open.";

let generation = 0;
let transition: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = transition.then(operation, operation);
  transition = result.catch(() => undefined);
  return result;
}

export function hasAcceptedActiveWork(state: Pick<CaptainWorkState, "activeWorkMode" | "lockStage"> | null | undefined) {
  return Boolean(state?.activeWorkMode && (state.lockStage === "ACCEPTED" || state.lockStage === "IN_PROGRESS"));
}

function showDisclosure() {
  return new Promise<boolean>((resolve) => {
    Alert.alert("Location during active work", ACTIVE_WORK_LOCATION_DISCLOSURE, [
      { text: "Not now", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", onPress: () => resolve(true) }
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

type BackgroundLocationData = { locations?: Location.LocationObject[] };

TaskManager.defineTask<BackgroundLocationData>(CAPTAIN_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  // Verify the assignment before persisting or sending any background sample.
  const sampleGeneration = generation;
  let state: CaptainWorkState;
  try {
    state = await captainAccessApi.workState();
  } catch {
    // Fail closed when the server cannot confirm that background tracking is still needed.
    await disableActiveWorkBackgroundLocation();
    return;
  }
  if (sampleGeneration !== generation) return;
  if (!hasAcceptedActiveWork(state)) {
    await disableActiveWorkBackgroundLocation();
    return;
  }
  const latest = data.locations[data.locations.length - 1];
  if (!latest) return;
  const tracePoints = await bufferBackgroundRideTrace(data.locations);
  const updated = await captainAccessApi.updateAvailability({ ...toOperationalLocationPayload({
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    accuracyMeters: latest.coords.accuracy,
    recordedAt: new Date(latest.timestamp).toISOString(),
    speedMetersPerSecond: latest.coords.speed,
    headingDegrees: latest.coords.heading
  }), tracePoints });
  await acknowledgeRideTracePoints(tracePoints.map((point) => point.clientPointId));
  if (!hasAcceptedActiveWork(updated)) await disableActiveWorkBackgroundLocation();
});

export function enableActiveWorkBackgroundLocation() {
  const request = ++generation;
  return serialize(async () => {
    const current = () => request === generation;
    if (!current() || AppState.currentState !== "active") return false;
    const state = await captainAccessApi.workState();
    if (!current() || !hasAcceptedActiveWork(state)) return false;
    const foreground = await Location.getForegroundPermissionsAsync();
    if (!current() || !foreground.granted) return false;
    if (await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)) return current();
    // Explicit consent precedes the OS permission prompt, including Android Settings.
    if (!current() || AppState.currentState !== "active" || !await showDisclosure()) return false;
    if (!current() || AppState.currentState !== "active") return false;
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!current() || !background.granted) return false;
    const latestState = await captainAccessApi.workState();
    if (!current() || !hasAcceptedActiveWork(latestState)) return false;
    await Location.startLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      activityType: Location.ActivityType.AutomotiveNavigation,
      distanceInterval: 50,
      deferredUpdatesDistance: 100,
      deferredUpdatesInterval: 60_000,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "KariGO Captain active Ride or Delivery",
        notificationBody: "Location is updating while your accepted assignment is active.",
        notificationColor: "#E31E24",
        killServiceOnDestroy: true
      }
    });
    // Ending work while native startup is pending must not leave tracking running.
    if (!current()) {
      await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK);
      return false;
    }
    return true;
  });
}

export function disableActiveWorkBackgroundLocation() {
  ++generation;
  return serialize(async () => {
    if (await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK);
    }
  });
}
