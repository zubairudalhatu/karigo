export type NigeriaStateOption = {
  code: string;
  name: string;
};

export const nigeriaStates: NigeriaStateOption[] = [
  { code: "ABIA", name: "Abia State" },
  { code: "ADAMAWA", name: "Adamawa State" },
  { code: "AKWA_IBOM", name: "Akwa Ibom State" },
  { code: "ANAMBRA", name: "Anambra State" },
  { code: "BAUCHI", name: "Bauchi State" },
  { code: "BAYELSA", name: "Bayelsa State" },
  { code: "BENUE", name: "Benue State" },
  { code: "BORNO", name: "Borno State" },
  { code: "CROSS_RIVER", name: "Cross River State" },
  { code: "DELTA", name: "Delta State" },
  { code: "EBONYI", name: "Ebonyi State" },
  { code: "EDO", name: "Edo State" },
  { code: "EKITI", name: "Ekiti State" },
  { code: "ENUGU", name: "Enugu State" },
  { code: "FCT", name: "Federal Capital Territory" },
  { code: "GOMBE", name: "Gombe State" },
  { code: "IMO", name: "Imo State" },
  { code: "JIGAWA", name: "Jigawa State" },
  { code: "KADUNA", name: "Kaduna State" },
  { code: "KANO", name: "Kano State" },
  { code: "KATSINA", name: "Katsina State" },
  { code: "KEBBI", name: "Kebbi State" },
  { code: "KOGI", name: "Kogi State" },
  { code: "KWARA", name: "Kwara State" },
  { code: "LAGOS", name: "Lagos State" },
  { code: "NASARAWA", name: "Nasarawa State" },
  { code: "NIGER", name: "Niger State" },
  { code: "OGUN", name: "Ogun State" },
  { code: "ONDO", name: "Ondo State" },
  { code: "OSUN", name: "Osun State" },
  { code: "OYO", name: "Oyo State" },
  { code: "PLATEAU", name: "Plateau State" },
  { code: "RIVERS", name: "Rivers State" },
  { code: "SOKOTO", name: "Sokoto State" },
  { code: "TARABA", name: "Taraba State" },
  { code: "YOBE", name: "Yobe State" },
  { code: "ZAMFARA", name: "Zamfara State" }
];

function normalizedState(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\(\s*FCT\s*\)/g, " FCT ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_STATE$/, "");
}

export function nigeriaStateByValue(value?: string | null) {
  const normalized = normalizedState(value ?? "");
  if (!normalized) return null;
  if (["FCT", "FEDERAL_CAPITAL_TERRITORY", "FEDERAL_CAPITAL_TERRITORY_FCT"].includes(normalized)) {
    return nigeriaStates.find((state) => state.code === "FCT") ?? null;
  }
  return nigeriaStates.find((state) => state.code === normalized || normalizedState(state.name) === normalized) ?? null;
}

export function canonicalNigeriaStateCode(value?: string | null) {
  return nigeriaStateByValue(value)?.code ?? null;
}
