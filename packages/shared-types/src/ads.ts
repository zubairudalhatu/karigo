export const customerAdPlacementSources = ["KARIGO", "ADMOB_FALLBACK", "NONE"] as const;
export type CustomerAdPlacementSource = (typeof customerAdPlacementSources)[number];

export interface CustomerAdPlacementDecision {
  source: CustomerAdPlacementSource;
  reason: "ELIGIBLE_KARIGO_CAMPAIGN" | "NO_KARIGO_INVENTORY" | "FALLBACK_DISABLED";
}
