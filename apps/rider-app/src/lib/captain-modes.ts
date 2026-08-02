import type { RiderProfile } from "../api/rider.api";

export type CaptainModeStatus = "ACTIVE" | "READINESS_ONLY" | "PENDING_APPROVAL" | "DISABLED";

export type CaptainMode = {
  key: "DELIVERY_CAPTAIN" | "DRIVER_CAPTAIN";
  label: string;
  status: CaptainModeStatus;
  badge: string;
  description: string;
  ctaLabel?: string;
  href?: string;
};

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

export const isTaxiStagingEnabled = ridesProductionEnabled;

export function deliveryCaptainMode(profile?: RiderProfile | null): CaptainMode {
  const active = profile?.verificationStatus === "ACTIVE";
  return {
    key: "DELIVERY_CAPTAIN",
    label: "Delivery Captain",
    status: active ? "ACTIVE" : "PENDING_APPROVAL",
    badge: active ? "Operations active" : "Pending approval",
    description: active
      ? "Handle KariGO delivery assignments, pickup milestones and customer handoff."
      : "Delivery assignments start after KariGO Operations activates this mode."
  };
}

export function driverCaptainMode(rideOperationsEnabled = ridesProductionEnabled()): CaptainMode {
  return {
    key: "DRIVER_CAPTAIN",
    label: "Ride Captain",
    status: rideOperationsEnabled ? "ACTIVE" : "DISABLED",
    badge: rideOperationsEnabled ? "Operations active" : "Activation pending",
    description: rideOperationsEnabled
      ? "Receive and progress KariGO Ride requests assigned by Operations."
      : "Submit ride and vehicle details for KariGO Operations review.",
    ctaLabel: rideOperationsEnabled ? "Ride operations" : "Ride review",
    href: "/taxi-readiness"
  };
}

export function captainModes(profile?: RiderProfile | null, rideOperationsEnabled = ridesProductionEnabled()) {
  return [deliveryCaptainMode(profile), driverCaptainMode(rideOperationsEnabled)];
}
