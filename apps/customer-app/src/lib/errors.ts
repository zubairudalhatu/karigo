import { KariGoApiError } from "@karigo/shared-types";

type ErrorContext = "default" | "login";

export function friendlyError(error: unknown, context: ErrorContext = "default"): string {
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) return "Invalid phone number or password.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You do not have access to this app.";
    if (["FLUTTERWAVE_CHECKOUT_LINK_MISSING", "FLUTTERWAVE_AUTH_FAILED"].includes(error.errorCode ?? "")) return "Flutterwave checkout is temporarily unavailable. Please use Pay on Delivery.";
    if (error.errorCode === "VALIDATION_ERROR") return error.message;
    return error.message || "We could not complete that request. Please try again.";
  }
  return "We could not complete that request. Please check your connection and try again.";
}

export function money(value: number | string | undefined): string {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
