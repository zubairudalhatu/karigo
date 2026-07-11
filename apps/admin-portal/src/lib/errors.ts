import { KariGoApiError } from "@karigo/shared-types";

type ErrorContext = "login" | "dashboard" | "form";

export function friendlyError(error: unknown, context: ErrorContext = "dashboard") {
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) {
      return "Invalid phone number or password.";
    }

    if (error.status === 401 || error.status === 403) {
      return "Your session has expired. Please sign in again.";
    }

    if (context === "form") {
      return error.status && error.status >= 500
        ? "Unable to complete request. Please try again."
        : error.message;
    }

    return context === "login"
      ? "We could not sign you in. Please try again."
      : "Unable to load dashboard. Please try again.";
  }

  if (error instanceof Error && error.message.includes("cannot use the admin portal")) {
    return error.message;
  }

  if (context === "form") {
    return error instanceof Error ? error.message : "Unable to complete request. Please try again.";
  }

  return context === "login"
    ? "We could not sign you in. Please try again."
    : "Unable to load dashboard. Please try again.";
}

export function money(value: unknown) {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
