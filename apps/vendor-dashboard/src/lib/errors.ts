import { KariGoApiError } from "@karigo/shared-types";

type ErrorContext = "login" | "dashboard" | "form";

export function friendlyError(error: unknown, context: ErrorContext = "dashboard") {
  if (error instanceof KariGoApiError) {
    if (context === "login" && error.status === 401) {
      return "Invalid phone number or password.";
    }

    if (context === "login" && error.status === 400) {
      return error.message;
    }

    if (context === "login" && error.status === 403) {
      if (error.errorCode === "PORTAL_ROLE_REJECTED") {
        return "This account is not authorised for the Partner Workspace.";
      }
      return error.message;
    }

    if (context === "login" && error.status && error.status >= 500) {
      return "KariGO services are temporarily unavailable. Please try again shortly.";
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
      : "Your dashboard could not be loaded. Please try again.";
  }

  if (context === "login" && error instanceof Error) {
    const safeMessages = [
      "This account is not authorised for the Partner Workspace.",
      "Your session could not be created. Please try again.",
      "Verify your phone number to finish account setup."
    ];
    if (safeMessages.some((message) => error.message.includes(message))) {
      return error.message;
    }
  }

  if (context === "form") {
    return error instanceof Error ? error.message : "Unable to complete request. Please try again.";
  }

  return context === "login"
    ? "We could not sign you in. Please try again."
    : "Your dashboard could not be loaded. Please try again.";
}

export function money(value: number | string | undefined) {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
