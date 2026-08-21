import { formatKobo } from "@karigo/shared-types";

export function formatRideFareKobo(value?: number | string | null, fallback = "Fare pending") {
  if (value === null || value === undefined || value === "") return fallback;
  return formatKobo(value, fallback);
}

export function formatRideFareRangeKobo(range?: { min: number; max: number } | null) {
  if (!range) return "Estimate pending";
  return `${formatRideFareKobo(range.min)}\u2013${formatRideFareKobo(range.max)}`;
}

export function rideStatusLabel(status: string) {
  const words = status.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
