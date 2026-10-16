import { ForbiddenException } from "@nestjs/common";
// Email-only governance identities must never enter legacy mobile/business flows.
// Existing Customer/Vendor/Rider records still require a phone at the DB boundary.
export function requiredMobile(value: string | null | undefined): string {
  if (value === null || value === undefined) throw new ForbiddenException("A mobile account is required for this operation");
  return value;
}
