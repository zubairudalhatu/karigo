export function ridesProductionEnabled() {
  const serviceEnabled =
    process.env.EXPO_PUBLIC_RIDES_SERVICE_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true";
  const productionEnabled =
    process.env.EXPO_PUBLIC_RIDES_PRODUCTION_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";

  return serviceEnabled && productionEnabled;
}

export const ridesControlledPilotEnabled = ridesProductionEnabled;
