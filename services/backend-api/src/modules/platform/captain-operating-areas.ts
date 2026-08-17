import { captainServiceAreas, CaptainServiceArea } from "./captain-catalog";

export const OPERATING_AREAS_REQUIRE_REVIEW = "Operating areas require review";

export type CaptainOperatingAreaApplication = {
  operatingAreaIds?: string[] | null;
  primaryOperatingAreaId?: string | null;
  city?: string | null;
  state?: string | null;
  residentialCityCode?: string | null;
  residentialStateCode?: string | null;
};

export type CaptainLegacyLocation = {
  city?: string | null;
  state?: string | null;
};

export type CaptainOperatingAreaSummary = {
  id: string;
  cityCode: string;
  cityName: string;
  stateCode: string;
  stateName: string;
  label: string;
};

const ACTIVE_AREAS = captainServiceAreas.filter((area) => area.isActive);
const AREA_CENTERS: Record<string, { latitude: number; longitude: number; radiusMeters: number }> = {
  "fct-abuja": { latitude: 9.0765, longitude: 7.3986, radiusMeters: 85_000 },
  "kano-kano": { latitude: 12.0022, longitude: 8.592, radiusMeters: 85_000 }
};

export function captainOperatingAreaSummary(area: CaptainServiceArea): CaptainOperatingAreaSummary {
  return {
    id: area.id,
    cityCode: area.cityCode,
    cityName: area.cityName,
    stateCode: area.stateCode,
    stateName: area.stateName,
    label: area.cityName
  };
}

export function captainOperatingAreaById(id?: string | null) {
  return ACTIVE_AREAS.find((area) => area.id === id) ?? null;
}

export function captainOperatingAreaFromText(...values: Array<string | null | undefined>) {
  const normalized = values.filter(Boolean).join(" ").toUpperCase().replace(/[^A-Z0-9]+/g, " ");
  if (!normalized.trim()) return null;
  return ACTIVE_AREAS.find((area) =>
    normalized.includes(area.cityCode) ||
    normalized.includes(area.cityName.toUpperCase()) ||
    normalized.includes(area.stateCode) ||
    normalized.includes(area.stateName.toUpperCase())
  ) ?? null;
}

export function captainOperatingAreaFromCoordinates(latitude?: number | null, longitude?: number | null) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const coordinate = { latitude: Number(latitude), longitude: Number(longitude) };
  return ACTIVE_AREAS.find((area) => {
    const center = AREA_CENTERS[area.id];
    return center ? distanceMeters(center, coordinate) <= center.radiusMeters : false;
  }) ?? null;
}

export function resolveCaptainOperatingAuthorization(
  application?: CaptainOperatingAreaApplication | null,
  legacyLocation?: CaptainLegacyLocation | null
) {
  const storedIds = application?.operatingAreaIds ?? [];
  const approvedAreas = storedIds
    .map((id) => captainOperatingAreaById(id))
    .filter((area): area is CaptainServiceArea => Boolean(area));
  const operatingAreasRequireReview = storedIds.length === 0;
  const legacyFallbackArea = operatingAreasRequireReview
    ? captainOperatingAreaFromText(
      legacyLocation?.city,
      legacyLocation?.state,
      application?.residentialCityCode,
      application?.residentialStateCode,
      application?.city,
      application?.state
    )
    : null;
  const primaryArea = captainOperatingAreaById(application?.primaryOperatingAreaId);
  return {
    approvedAreas,
    primaryArea,
    legacyFallbackArea,
    operatingAreasRequireReview,
    authorizedAreaIds: approvedAreas.length
      ? approvedAreas.map((area) => area.id)
      : legacyFallbackArea
        ? [legacyFallbackArea.id]
        : []
  };
}

export function captainIsApprovedForOperatingArea(
  application: CaptainOperatingAreaApplication | null | undefined,
  areaId: string,
  legacyLocation?: CaptainLegacyLocation | null
) {
  return resolveCaptainOperatingAuthorization(application, legacyLocation).authorizedAreaIds.includes(areaId);
}

export function captainOperatingAreaProjection(
  application?: CaptainOperatingAreaApplication | null,
  legacyLocation?: CaptainLegacyLocation | null
) {
  const authorization = resolveCaptainOperatingAuthorization(application, legacyLocation);
  return {
    approvedOperatingAreas: authorization.approvedAreas.map(captainOperatingAreaSummary),
    primaryOperatingArea: authorization.primaryArea ? captainOperatingAreaSummary(authorization.primaryArea) : null,
    operatingAreasRequireReview: authorization.operatingAreasRequireReview,
    operatingAreasReviewMessage: authorization.operatingAreasRequireReview ? OPERATING_AREAS_REQUIRE_REVIEW : null
  };
}

export function captainResidentialLocation(application?: CaptainOperatingAreaApplication | null, fallback?: CaptainLegacyLocation | null) {
  const area = captainOperatingAreaFromText(
    application?.residentialCityCode,
    application?.residentialStateCode,
    application?.city,
    application?.state,
    fallback?.city,
    fallback?.state
  );
  return {
    city: application?.city ?? fallback?.city ?? area?.cityName ?? null,
    state: application?.state ?? fallback?.state ?? area?.stateName ?? null,
    cityCode: application?.residentialCityCode ?? area?.cityCode ?? null,
    stateCode: application?.residentialStateCode ?? area?.stateCode ?? null,
    label: [application?.city ?? fallback?.city ?? area?.cityName, application?.state ?? fallback?.state ?? area?.stateName]
      .filter(Boolean)
      .join(", ") || null
  };
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6_371_000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}
