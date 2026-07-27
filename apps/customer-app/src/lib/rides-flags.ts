export function ridesControlledPilotEnabled() {
  const serviceEnabled =
    process.env.EXPO_PUBLIC_RIDES_SERVICE_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true";
  const pilotEnabled =
    process.env.EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";

  return serviceEnabled && pilotEnabled;
}
