import { KariGoApiError } from "@karigo/shared-types";
export function friendlyError(error: unknown) { if (error instanceof KariGoApiError) return error.status === 401 ? "Your session has expired. Please sign in again." : error.message; if (error instanceof Error && error.message.includes("cannot use the vendor dashboard")) return error.message; return "Your dashboard could not be loaded. Please try again."; }
export function money(value: number | string | undefined) { return `NGN ${Number(value ?? 0).toLocaleString()}`; }
