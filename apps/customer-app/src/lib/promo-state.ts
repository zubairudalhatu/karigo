import { KariGoApiError } from "@karigo/shared-types";
import { friendlyError } from "./errors";

export function promoErrorMessage(error: unknown): string {
  if (error instanceof KariGoApiError) {
    if (error.message === "Customer promo usage limit reached") {
      return "This promo code has already been used on your account.";
    }
    return friendlyError(error);
  }
  return friendlyError(error);
}
