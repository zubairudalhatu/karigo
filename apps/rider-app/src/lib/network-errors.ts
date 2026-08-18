import { ApiNetworkError, ApiResponseError, ApiTimeoutError } from "@karigo/config";
import { friendlyError } from "./errors";

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
