import { KariGoApiError } from "@karigo/shared-types";
type ErrorContext = "default" | "login";

export function friendlyError(error: unknown, context: ErrorContext = "default"): string {
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) return "Invalid phone number or password.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You do not have access to this app.";
    return error.message || "We could not complete that request. Please try again.";
  }
  if (error instanceof Error && error.message.includes("cannot use the rider app")) return error.message;
  return "We could not complete that request. Please check your connection and try again.";
}
export function money(value: number | string | undefined) { return `NGN ${Number(value ?? 0).toLocaleString()}`; }
