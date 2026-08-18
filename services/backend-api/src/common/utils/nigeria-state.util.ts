const STATE_CODES = new Set([
  "ABIA", "ADAMAWA", "AKWA_IBOM", "ANAMBRA", "BAUCHI", "BAYELSA", "BENUE", "BORNO", "CROSS_RIVER",
  "DELTA", "EBONYI", "EDO", "EKITI", "ENUGU", "FCT", "GOMBE", "IMO", "JIGAWA", "KADUNA", "KANO",
  "KATSINA", "KEBBI", "KOGI", "KWARA", "LAGOS", "NASARAWA", "NIGER", "OGUN", "ONDO", "OSUN", "OYO",
  "PLATEAU", "RIVERS", "SOKOTO", "TARABA", "YOBE", "ZAMFARA"
]);

function normalizedState(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\(\s*FCT\s*\)/g, " FCT ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_STATE$/, "");
}

export function canonicalNigeriaStateCode(value?: string | null) {
  const normalized = normalizedState(value ?? "");
  if (["FCT", "FEDERAL_CAPITAL_TERRITORY", "FEDERAL_CAPITAL_TERRITORY_FCT"].includes(normalized)) return "FCT";
  return STATE_CODES.has(normalized) ? normalized : null;
}
