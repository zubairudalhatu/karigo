import type { CustomerAdPlacementDecision } from "@karigo/shared-types";

export function customerAdPlacementDecision(
  eligibleKariGoCampaigns: number,
  admobFallbackPermitted: boolean
): CustomerAdPlacementDecision {
  if (eligibleKariGoCampaigns > 0) {
    return { source: "KARIGO", reason: "ELIGIBLE_KARIGO_CAMPAIGN" };
  }
  if (admobFallbackPermitted) {
    return { source: "ADMOB_FALLBACK", reason: "NO_KARIGO_INVENTORY" };
  }
  return { source: "NONE", reason: "FALLBACK_DISABLED" };
}
