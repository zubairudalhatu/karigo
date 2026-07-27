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

export function isTaxiStagingEnabled() {
  const serviceEnabled =
    process.env.EXPO_PUBLIC_RIDES_SERVICE_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true";
  const pilotEnabled =
    process.env.EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED === "true" ||
    process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";

  return serviceEnabled && pilotEnabled;
}

export function deliveryCaptainMode(profile?: RiderProfile | null): CaptainMode {
  const active = profile?.verificationStatus === "ACTIVE";
  return {
    key: "DELIVERY_CAPTAIN",
    label: "Delivery Captain",
    status: active ? "ACTIVE" : "PENDING_APPROVAL",
    badge: active ? "Approved" : "Pending approval",
    description: active
      ? "Handle KariGO delivery assignments, pickup milestones and customer handoff."
      : "Delivery jobs unlock after KariGO approves this Captain account."
  };
}

export function driverCaptainMode(taxiStagingEnabled = isTaxiStagingEnabled()): CaptainMode {
  return {
    key: "DRIVER_CAPTAIN",
    label: "Ride Captain",
    status: taxiStagingEnabled ? "ACTIVE" : "DISABLED",
    badge: taxiStagingEnabled ? "Controlled pilot" : "Review only",
    description: taxiStagingEnabled
      ? "Receive and progress manually assigned KariGO Rides pilot trips after approval."
      : "Submit ride and vehicle details while KariGO Rides remains gated.",
    ctaLabel: taxiStagingEnabled ? "Ride operations" : "Ride review",
    href: "/taxi-readiness"
  };
}

export function captainModes(profile?: RiderProfile | null, taxiStagingEnabled = isTaxiStagingEnabled()) {
  return [deliveryCaptainMode(profile), driverCaptainMode(taxiStagingEnabled)];
}
