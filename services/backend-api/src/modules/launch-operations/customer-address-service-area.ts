import { canonicalNigeriaStateCode } from "../../common/utils/nigeria-state.util";
import { captainOperatingAreaFromCoordinates } from "../platform/captain-operating-areas";

export type CustomerAddressLocation = {
  city: string;
  state: string;
  latitude?: unknown;
  longitude?: unknown;
};

export type CustomerServiceAreaCode = "ABUJA" | "KANO";

function normalized(value?: string | null) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function cityCode(value?: string | null): CustomerServiceAreaCode | null {
  const text = normalized(value);
  if (text === "ABUJA" || text.includes(" ABUJA ") || text.startsWith("ABUJA ") || text.endsWith(" ABUJA")) return "ABUJA";
  if (text === "KANO" || text.includes(" KANO ") || text.startsWith("KANO ") || text.endsWith(" KANO")) return "KANO";
  return null;
}

function coordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function customerAddressServiceArea(address: CustomerAddressLocation): CustomerServiceAreaCode | null {
  const resolvedCity = cityCode(address.city);
  const resolvedState = canonicalNigeriaStateCode(address.state);

  if (resolvedCity === "ABUJA" && (!resolvedState || resolvedState === "FCT")) return "ABUJA";
  if (resolvedCity && resolvedState && (
    (resolvedCity === "ABUJA" && resolvedState !== "FCT") ||
    (resolvedCity === "KANO" && resolvedState !== "KANO")
  )) return null;

  if (resolvedCity === "KANO" && (!resolvedState || resolvedState === "KANO")) return "KANO";

  const latitude = coordinate(address.latitude);
  const longitude = coordinate(address.longitude);
  const coordinateArea = captainOperatingAreaFromCoordinates(latitude, longitude);
  if (coordinateArea?.cityCode === "ABUJA" || coordinateArea?.cityCode === "KANO") return coordinateArea.cityCode;

  const combined = normalized(`${address.city} ${address.state}`);
  if (combined.includes("ABUJA") && (combined.includes("FCT") || combined.includes("FEDERAL CAPITAL TERRITORY"))) return "ABUJA";
  if (combined.includes("KANO") && (combined === "KANO" || combined.includes("KANO STATE") || resolvedState === "KANO")) return "KANO";
  return null;
}

export function customerHasServiceAreaAddress(addresses: CustomerAddressLocation[], selectedCityCode: CustomerServiceAreaCode) {
  return addresses.some((address) => customerAddressServiceArea(address) === selectedCityCode);
}
