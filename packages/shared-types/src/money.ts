export type KoboAmount = number;
export type NairaAmount = number | string;

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Formats a naira-denominated decimal without applying a unit conversion. */
export function formatNaira(value?: NairaAmount | null, fallback = "NGN 0.00") {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `NGN ${nairaFormatter.format(numeric)}` : fallback;
}

/** Formats an integer kobo amount after converting exactly once to naira. */
export function formatKobo(value?: KoboAmount | string | null, fallback = "NGN 0.00") {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatNaira(numeric / 100, fallback) : fallback;
}
