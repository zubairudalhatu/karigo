import { ApiNetworkError, ApiResponseError, ApiTimeoutError } from "@karigo/config";
import { friendlyError } from "./errors";
import { CaptainLocationError } from "./location";

export type CaptainRequestImportance = "critical" | "secondary";
export interface CaptainAvailabilityDenial {
  message?: string | null;
  errorCode?: string | null;
  reason?: string | null;
  reasonCode?: string | null;
}

type KnownAvailabilityDenial = { priority: number; message: string };

function classifyKnownAvailabilityDenial(
  denial: CaptainAvailabilityDenial,
  options: { area?: string; service?: "Ride" | "Delivery" | "work" }
): KnownAvailabilityDenial | null {
  const message = (denial.message ?? denial.reason)?.trim() ?? "";
  const normalizedMessage = message.toLowerCase();
  const code = (denial.errorCode ?? denial.reasonCode)?.trim().toUpperCase() ?? "";

  if (normalizedMessage.includes("operating window")) {
    return { priority: 0, message: "Go online only during your scheduled operating window." };
  }
  if (
    normalizedMessage.includes("service area") ||
    normalizedMessage.includes("operating area") ||
    normalizedMessage.includes("approved to operate") ||
    normalizedMessage.includes("current area is not approved")
  ) {
    return { priority: 1, message: message || `You can only go online in an approved KariGO service area for ${options.area || "your area"}.` };
  }
  if (
    code === "LOCATION_STALE" ||
    normalizedMessage.includes("device gps") ||
    normalizedMessage.includes("location is stale") ||
    normalizedMessage.includes("location stale")
  ) {
    return { priority: 2, message: "Update device GPS before going online." };
  }
  if (
    normalizedMessage.includes("precise") ||
    normalizedMessage.includes("foreground location") ||
    normalizedMessage.includes("location is required") ||
    normalizedMessage.includes("location unavailable")
  ) {
    return { priority: 2, message: "Allow precise location to go online." };
  }
  if (
    code === "FINANCIAL_SETTLEMENT_REQUIRED" ||
    normalizedMessage.includes("outstanding karigo service fee") ||
    normalizedMessage.includes("service fees must be settled") ||
    normalizedMessage.includes("commission threshold")
  ) {
    return { priority: 3, message: "Settle your outstanding KariGO service fee to continue receiving Ride requests." };
  }
  if (
    code === "SUSPENDED" ||
    normalizedMessage.includes("account restriction") ||
    normalizedMessage.includes("account is not active") ||
    normalizedMessage.includes("account suspended") ||
    normalizedMessage.includes("captain suspended")
  ) {
    return { priority: 4, message: message || "Your Captain account is not currently eligible to go online." };
  }
  if (
    code === "APPLICATION_NOT_APPROVED" ||
    code === "ACTIVATION_PENDING" ||
    code === "PROFILE_INACTIVE" ||
    normalizedMessage.includes("application is not approved") ||
    normalizedMessage.includes("captain activation") ||
    normalizedMessage.includes("profile is inactive")
  ) {
    return { priority: 4, message: message || "Captain approval and activation are required before going online." };
  }
  return null;
}

export function captainKnownAvailabilityDenial(
  denials: CaptainAvailabilityDenial[],
  options: { area?: string; service?: "Ride" | "Delivery" | "work" } = {}
): string | null {
  const known = denials
    .map((denial) => classifyKnownAvailabilityDenial(denial, options))
    .filter((denial): denial is KnownAvailabilityDenial => denial !== null)
    .sort((left, right) => left.priority - right.priority);
  return known[0]?.message ?? null;
}

export function captainRequestMessage(error: unknown, importance: CaptainRequestImportance) {
  if (error instanceof ApiNetworkError) {
    return "You're offline. We'll reconnect when your connection returns.";
  }
  if (error instanceof ApiTimeoutError) {
    return importance === "secondary"
      ? "Some information could not be refreshed. Tap to retry."
      : "KariGO is taking longer than expected. Try again.";
  }
  if (error instanceof ApiResponseError && Number(error.status) >= 500) {
    return importance === "secondary"
      ? "Some information could not be refreshed. Tap to retry."
      : "KariGO is temporarily unavailable. Try again.";
  }
  return friendlyError(error);
}

export function captainAvailabilityErrorMessage(
  error: unknown,
  options: { area?: string; service?: "Ride" | "Delivery" | "work" } = {}
) {
  if (error instanceof CaptainLocationError) return error.message;
  if (error instanceof ApiNetworkError || error instanceof ApiTimeoutError) {
    return "We couldn't take you online. Please try again.";
  }
  if (error instanceof ApiResponseError) {
    const message = error.message.toLowerCase();
    console.warn("captain_availability_rejected", { status: error.status, errorCode: error.errorCode });
    const knownDenial = captainKnownAvailabilityDenial(
      [{ message: error.message, errorCode: error.errorCode }],
      options
    );
    if (knownDenial) return knownDenial;
    if (message.includes("property ") || message.includes("should not exist") || message.includes("dto") || message.includes("prisma") || message.includes("database")) {
      return "We couldn't take you online. Please try again.";
    }
    if (message.includes("unavailable") || message.includes("not enabled") || message.includes("not open") || message.includes("launch stage")) {
      const area = options.area || "your area";
      if (options.service === "Ride") return `Rides aren't open in ${area} yet.`;
      if (options.service === "Delivery") return `Deliveries aren't open in ${area} yet.`;
      return `Work isn't open in ${area} yet.`;
    }
    if (Number(error.status) >= 500) return "We couldn't take you online. Please try again.";
  }
  return "We couldn't take you online. Please try again.";
}
