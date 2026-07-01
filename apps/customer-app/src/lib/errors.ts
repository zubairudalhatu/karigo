import { KariGoApiError } from "@karigo/shared-types";

export function friendlyError(error: unknown): string {
  if (error instanceof KariGoApiError) {
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.errorCode === "VALIDATION_ERROR") return error.message;
    return error.message || "We could not complete that request. Please try again.";
  }
  return "We could not complete that request. Please check your connection and try again.";
}

export function money(value: number | string | undefined): string {
  return `NGN ${Number(value ?? 0).toLocaleString()}`;
}
