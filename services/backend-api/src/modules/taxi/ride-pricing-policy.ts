export const RIDE_CATEGORY_IDS = ["ECONOMY", "COMFORT", "EXECUTIVE", "XL"] as const;
export type RideCategoryId = (typeof RIDE_CATEGORY_IDS)[number];
export type RideCategoryMinimums = Record<RideCategoryId, number>;

export const APPROVED_RIDE_CATEGORY_MINIMUMS_KOBO: RideCategoryMinimums = Object.freeze({
  ECONOMY: 170_000,
  COMFORT: 230_000,
  EXECUTIVE: 270_000,
  XL: 320_000
});

// City keys deliberately live behind this policy boundary. The active markets use the
// same approved floors today, but callers already resolve a service area before pricing.
const SERVICE_AREA_MINIMUMS_KOBO: Readonly<Record<string, RideCategoryMinimums>> = Object.freeze({
  DEFAULT: APPROVED_RIDE_CATEGORY_MINIMUMS_KOBO,
  ABUJA: APPROVED_RIDE_CATEGORY_MINIMUMS_KOBO,
  KANO: APPROVED_RIDE_CATEGORY_MINIMUMS_KOBO
});

export function normalizeRideCategory(value?: string | null): RideCategoryId {
  const normalized = value?.trim().toUpperCase();
  return RIDE_CATEGORY_IDS.includes(normalized as RideCategoryId)
    ? normalized as RideCategoryId
    : "ECONOMY";
}

export function rideCategoryMinimumsForServiceArea(serviceArea?: string | null): RideCategoryMinimums {
  const key = serviceArea?.trim().toUpperCase() || "DEFAULT";
  return SERVICE_AREA_MINIMUMS_KOBO[key] ?? SERVICE_AREA_MINIMUMS_KOBO.DEFAULT;
}

export function rideCategoryMinimumFareKobo(category: string | null | undefined, serviceArea?: string | null) {
  return rideCategoryMinimumsForServiceArea(serviceArea)[normalizeRideCategory(category)];
}

export function applyCategoryMinimumRideFare(
  fareKobo: number,
  category: string | null | undefined,
  serviceArea?: string | null
) {
  const rounded = Math.max(0, Math.round(fareKobo));
  const minimumFareKobo = rideCategoryMinimumFareKobo(category, serviceArea);
  return {
    rideFareKobo: Math.max(rounded, minimumFareKobo),
    minimumFareApplied: rounded < minimumFareKobo,
    minimumFareKobo,
    rideCategory: normalizeRideCategory(category)
  };
}
