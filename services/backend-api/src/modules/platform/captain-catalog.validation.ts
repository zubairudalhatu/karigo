import { BadRequestException } from "@nestjs/common";
import {
  captainServiceAreas,
  vehicleCatalog,
  VehicleCatalogOption
} from "@karigo/shared-types";

export interface CaptainLocationInput {
  residentialStateCode?: string;
  residentialCityCode?: string;
  state?: string;
  city?: string;
  operatingAreaIds?: string[];
  primaryOperatingAreaId?: string;
}

export interface CaptainVehicleInput {
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColour?: string;
  vehicleCustomMake?: string;
  vehicleCustomModel?: string;
  vehicleCustomColour?: string;
  driverLicenceExpiry?: string | Date;
}

export function catalogError(code: string, message: string): BadRequestException {
  return new BadRequestException({ message, errorCode: code });
}

function normalizeCode(value?: string | null) {
  return value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") ?? "";
}

function normalizeAreaIds(values?: string[]) {
  return Array.from(new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function labelForOption(options: VehicleCatalogOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function resolveCaptainLocation(input: CaptainLocationInput) {
  const stateCode = normalizeCode(input.residentialStateCode) || normalizeCode(input.state);
  const cityCode = normalizeCode(input.residentialCityCode) || normalizeCode(input.city);
  if (!stateCode) throw catalogError("RESIDENTIAL_STATE_REQUIRED", "Residential State or Territory is required.");
  if (!cityCode) throw catalogError("RESIDENTIAL_CITY_REQUIRED", "Residential City is required.");

  const activeAreas = captainServiceAreas.filter((area) => area.isActive);
  const residential = activeAreas.find((area) => area.stateCode === stateCode && area.cityCode === cityCode);
  if (!residential) {
    throw catalogError("CITY_NOT_IN_SELECTED_STATE", "Residential City must belong to a supported KariGO State or Territory.");
  }

  const operatingAreaIds = normalizeAreaIds(input.operatingAreaIds);
  if (!operatingAreaIds.length) {
    throw catalogError("OPERATING_AREA_REQUIRED", "Select at least one preferred operating area.");
  }

  const supportedIds = new Set(activeAreas.map((area) => area.id));
  const unsupported = operatingAreaIds.find((areaId) => !supportedIds.has(areaId));
  if (unsupported) {
    throw catalogError("OPERATING_AREA_UNSUPPORTED", "One or more selected operating areas are not currently supported by KariGO.");
  }

  const primaryOperatingAreaId = input.primaryOperatingAreaId?.trim().toLowerCase();
  if (!primaryOperatingAreaId) {
    throw catalogError("PRIMARY_OPERATING_AREA_REQUIRED", "Select a primary operating area.");
  }
  if (!operatingAreaIds.includes(primaryOperatingAreaId)) {
    throw catalogError("PRIMARY_OPERATING_AREA_INVALID", "Primary operating area must be one of the selected operating areas.");
  }

  const primaryArea = activeAreas.find((area) => area.id === primaryOperatingAreaId);
  return {
    residentialStateCode: residential.stateCode,
    residentialCityCode: residential.cityCode,
    state: residential.stateCode === "FCT" ? "FCT" : residential.stateName.replace(/\s+State$/i, ""),
    city: residential.cityName,
    operatingAreaIds,
    primaryOperatingAreaId,
    operatingAreas: operatingAreaIds.map((areaId) => activeAreas.find((area) => area.id === areaId)!),
    primaryOperatingArea: primaryArea!
  };
}

export function resolveVehicleDetails(input: CaptainVehicleInput) {
  const catalog = vehicleCatalog();
  const make = normalizeCode(input.vehicleMake);
  const model = normalizeCode(input.vehicleModel);
  const colour = normalizeCode(input.vehicleColour);

  if (!make) throw catalogError("VEHICLE_MAKE_REQUIRED", "Vehicle make is required.");
  const makeOption = catalog.makes.find((option) => option.value === make);
  if (!makeOption) throw catalogError("VEHICLE_MAKE_UNSUPPORTED", "Select a supported vehicle make.");
  if (make === "OTHER" && !input.vehicleCustomMake?.trim()) {
    throw catalogError("CUSTOM_VEHICLE_MAKE_REQUIRED", "Enter the vehicle make when Other is selected.");
  }

  if (!model) throw catalogError("VEHICLE_MODEL_REQUIRED", "Vehicle model is required.");
  const modelOption = makeOption.models.find((option) => option.value === model);
  if (!modelOption) throw catalogError("VEHICLE_MODEL_INVALID_FOR_MAKE", "Vehicle model must belong to the selected make.");
  if (model === "OTHER" && !input.vehicleCustomModel?.trim()) {
    throw catalogError("CUSTOM_VEHICLE_MODEL_REQUIRED", "Enter the vehicle model when Other is selected.");
  }

  const year = Number(input.vehicleYear);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < catalog.earliestYear || year > currentYear) {
    throw catalogError("VEHICLE_YEAR_INVALID", `Vehicle year must be between ${catalog.earliestYear} and ${currentYear}.`);
  }

  if (!colour) throw catalogError("VEHICLE_COLOUR_REQUIRED", "Vehicle colour is required.");
  const colourOption = catalog.colours.find((option) => option.value === colour);
  if (!colourOption) throw catalogError("VEHICLE_COLOUR_UNSUPPORTED", "Select a supported vehicle colour.");
  if (colour === "OTHER" && !input.vehicleCustomColour?.trim()) {
    throw catalogError("CUSTOM_VEHICLE_COLOUR_REQUIRED", "Enter the vehicle colour when Other is selected.");
  }

  return {
    vehicleMake: make,
    vehicleMakeLabel: make === "OTHER" ? input.vehicleCustomMake!.trim() : makeOption.label,
    vehicleModel: model,
    vehicleModelLabel: model === "OTHER" ? input.vehicleCustomModel!.trim() : labelForOption(makeOption.models, model),
    vehicleYear: year,
    vehicleColour: colour,
    vehicleColourLabel: colour === "OTHER" ? input.vehicleCustomColour!.trim() : colourOption.label,
    vehicleCustomMake: make === "OTHER" ? input.vehicleCustomMake!.trim() : undefined,
    vehicleCustomModel: model === "OTHER" ? input.vehicleCustomModel!.trim() : undefined,
    vehicleCustomColour: colour === "OTHER" ? input.vehicleCustomColour!.trim() : undefined
  };
}

export function assertFutureLicenceDate(value?: string | Date) {
  if (!value) throw catalogError("DRIVER_LICENCE_EXPIRY_REQUIRED", "Driver licence expiry date is required.");
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw catalogError("DRIVER_LICENCE_EXPIRY_INVALID", "Driver licence expiry date is invalid.");
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const max = new Date(todayUtc);
  max.setUTCFullYear(max.getUTCFullYear() + 15);
  if (date < todayUtc) throw catalogError("DRIVER_LICENCE_EXPIRED", "Driver licence expiry date cannot be in the past.");
  if (date > max) throw catalogError("DRIVER_LICENCE_EXPIRY_TOO_FAR", "Driver licence expiry date is too far in the future.");
  return date;
}
