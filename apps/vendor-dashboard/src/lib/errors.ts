import { KariGoApiError } from "@karigo/shared-types";

type ErrorContext = "login" | "dashboard";

export function friendlyError(error: unknown, context: ErrorContext = "dashboard") {
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) {
      return "Invalid phone number or password.";
    }

    if (error.status === 401 || error.status === 403) {
      return "Your session has expired. Please sign in again.";
    }

    return context === "login"
      ? "We could not sign you in. Please try again."
      : "Your dashboard could not be loaded. Please try again.";
  }

  if (error instanceof Error && error.message.includes("cannot use the vendor dashboard")) {
    return error.message;
  }

  return context === "login"
    ? "We could not sign you in. Please try again."
    : "Your dashboard could not be loaded. Please try again.";
}

export function money(value: number | string | undefined) {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
