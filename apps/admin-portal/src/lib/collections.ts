import { KariGoApiError } from "@karigo/shared-types";

function describeShape(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

export function requireCollection<T>(value: unknown, label: string): T[] {
  if (Array.isArray(value)) return value as T[];
  console.error(`Admin collection response had invalid shape collection=${label} shape=${describeShape(value)}`);
  throw new KariGoApiError(`We could not load ${label}. Please retry.`, "ADMIN_COLLECTION_INVALID_SHAPE", 502);
}

export function collectionLoadError(error: unknown, label: string) {
  if (error instanceof KariGoApiError) {
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return error.message || `You do not have access to ${label}.`;
    if (error.errorCode === "ADMIN_COLLECTION_INVALID_SHAPE") return error.message;
  }
  return `We could not load ${label}. Please retry.`;
}
