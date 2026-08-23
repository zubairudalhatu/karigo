export const DEFAULT_RIDE_COMMISSION_WARNING_THRESHOLD_KOBO = 800_000;
export const DEFAULT_RIDE_COMMISSION_URGENT_THRESHOLD_KOBO = 900_000;
export const DEFAULT_RIDE_COMMISSION_BLOCK_THRESHOLD_KOBO = 1_000_000;

export type RideCommissionEligibilityLevel = "ELIGIBLE" | "WARNING" | "URGENT" | "BLOCKED";

export interface RideCommissionPosition {
  platformReceivableKobo: number;
  platformAdjustmentKobo: number;
  remittedKobo: number;
  refunds?: Array<{ platformResponsibilityKobo: number }>;
}

export interface RideCommissionThresholds {
  warningKobo: number;
  urgentKobo: number;
  blockKobo: number;
}

export function captainCommissionObligationKobo(position: RideCommissionPosition): number {
  const platformFundedRefunds = (position.refunds ?? []).reduce(
    (sum, refund) => sum + refund.platformResponsibilityKobo,
    0
  );
  return Math.max(0, position.platformReceivableKobo + position.platformAdjustmentKobo + platformFundedRefunds);
}

export function captainCommissionOutstandingKobo(position: RideCommissionPosition): number {
  return Math.max(0, captainCommissionObligationKobo(position) - position.remittedKobo);
}

export function evaluateRideCommissionEligibility(
  outstandingKobo: number,
  thresholds: RideCommissionThresholds
) {
  const level: RideCommissionEligibilityLevel = outstandingKobo >= thresholds.blockKobo
    ? "BLOCKED"
    : outstandingKobo >= thresholds.urgentKobo
      ? "URGENT"
      : outstandingKobo >= thresholds.warningKobo
        ? "WARNING"
        : "ELIGIBLE";
  return {
    outstandingKobo,
    level,
    rideEligible: level !== "BLOCKED",
    thresholds,
    message: level === "BLOCKED"
      ? "Outstanding KariGO service fees must be settled before receiving another Ride."
      : level === "URGENT"
        ? "Your KariGO service fee balance is close to the Ride settlement limit."
        : level === "WARNING"
          ? "Your KariGO service fee balance has reached the warning level."
          : "Your KariGO service fee balance is within the Ride eligibility limit."
  };
}
