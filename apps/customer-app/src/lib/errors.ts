import {
  ApiBaseUrlError,
  ApiNetworkError,
  ApiParseError,
  ApiTimeoutError,
  SessionCorruptionError,
  SessionPersistenceError,
  SessionTemporarilyUnavailableError,
  StaleAuthOperationError
} from "@karigo/config";
import { KariGoApiError } from "@karigo/shared-types";

type ErrorContext = "default" | "login";

export function friendlyError(error: unknown, context: ErrorContext = "default"): string {
  if (error instanceof ApiBaseUrlError) return "KariGO is not configured correctly on this build. Please install the latest app update.";
  if (error instanceof ApiTimeoutError) return "The request timed out. Please check your connection and try again.";
  if (error instanceof ApiNetworkError) return "KariGO could not connect. Please check your network and try again.";
  if (error instanceof ApiParseError) return "KariGO could not read the server response safely. Please try again.";
  if (error instanceof SessionTemporarilyUnavailableError) return error.message;
  if (error instanceof SessionCorruptionError) return "Your saved login needs to be reset before continuing.";
  if (error instanceof SessionPersistenceError) return "KariGO could not save your login securely. Please try signing in again.";
  if (error instanceof StaleAuthOperationError) return "A newer login session is already active.";
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) return "Invalid phone number or password.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You do not have access to this app.";
    if (error.errorCode === "ACTIVE_RIDE_EXISTS") return "You already have an active KariGO Ride. View or cancel it before requesting another immediate ride.";
    if (["FLUTTERWAVE_CHECKOUT_LINK_MISSING", "FLUTTERWAVE_AUTH_FAILED", "FLUTTERWAVE_ENDPOINT_NOT_FOUND"].includes(error.errorCode ?? "")) return "Flutterwave checkout is temporarily unavailable. Please use Pay on Delivery.";
    if (error.errorCode === "VALIDATION_ERROR") return error.message;
    return error.message || "We could not complete that request. Please try again.";
  }
  return "We could not complete that request. Please check your connection and try again.";
}

export function money(value: number | string | undefined): string {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
