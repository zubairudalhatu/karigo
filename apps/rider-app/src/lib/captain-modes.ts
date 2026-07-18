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
  return process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" &&
    process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";
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
    status: taxiStagingEnabled ? "READINESS_ONLY" : "DISABLED",
    badge: taxiStagingEnabled ? "Operations review" : "Review only",
    description: taxiStagingEnabled
      ? "KariGO Rides is limited to approved operations checks. Ride dispatch remains controlled."
      : "Submit ride and vehicle details while KariGO Rides remains gated.",
    ctaLabel: "Ride review",
    href: "/taxi-readiness"
  };
}

export function captainModes(profile?: RiderProfile | null, taxiStagingEnabled = isTaxiStagingEnabled()) {
  return [deliveryCaptainMode(profile), driverCaptainMode(taxiStagingEnabled)];
}
