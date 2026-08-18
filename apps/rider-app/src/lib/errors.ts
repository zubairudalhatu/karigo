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
  if (error instanceof ApiBaseUrlError) return "KariGO Captain is not configured correctly on this build. Please install the latest app update.";
  if (error instanceof ApiTimeoutError) return "KariGO is taking longer than expected. Try again.";
  if (error instanceof ApiNetworkError) return "You're offline. We'll reconnect when your connection returns.";
  if (error instanceof ApiParseError) return "KariGO Captain could not read the server response safely. Please try again.";
  if (error instanceof SessionTemporarilyUnavailableError) return error.message;
  if (error instanceof SessionCorruptionError) return "Your saved Captain login needs to be reset before continuing.";
  if (error instanceof SessionPersistenceError) return "KariGO Captain could not save your login securely. Please try signing in again.";
  if (error instanceof StaleAuthOperationError) return "A newer login session is already active.";
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) return "Invalid phone number or password.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return error.message || "Captain operations will be available after KariGO approves your application.";
    return error.message || "We could not complete that request. Please try again.";
  }
  if (error instanceof Error && error.message.includes("cannot use the Captain app")) return error.message;
  return "We could not complete that request. Please try again.";
}
export function money(value: number | string | undefined) { return `NGN ${Number(value ?? 0).toLocaleString()}`; }
