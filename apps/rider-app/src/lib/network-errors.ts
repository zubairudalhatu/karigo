import { ApiNetworkError, ApiResponseError, ApiTimeoutError } from "@karigo/config";
import { friendlyError } from "./errors";
import { CaptainLocationError } from "./location";

export type CaptainRequestImportance = "critical" | "secondary";

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
    return "We couldn't update your work status. Trying again shortly.";
  }
  if (error instanceof ApiResponseError) {
    const message = error.message.toLowerCase();
    console.warn("captain_availability_rejected", { status: error.status, errorCode: error.errorCode });
    if (message.includes("precise") || message.includes("foreground location") || message.includes("location is required")) {
      return "Allow precise location to go online.";
    }
    if (message.includes("property ") || message.includes("should not exist") || message.includes("dto") || message.includes("prisma") || message.includes("database")) {
      return "We couldn't take you online. Please try again.";
    }
    if (message.includes("unavailable") || message.includes("not enabled") || message.includes("not open") || message.includes("launch stage")) {
      const area = options.area || "your area";
      if (options.service === "Ride") return `Rides aren't open in ${area} yet.`;
      if (options.service === "Delivery") return `Deliveries aren't open in ${area} yet.`;
      return `Work isn't open in ${area} yet.`;
    }
    if (Number(error.status) >= 500) return "We couldn't update your work status. Trying again shortly.";
  }
  return "We couldn't take you online. Please try again.";
}
