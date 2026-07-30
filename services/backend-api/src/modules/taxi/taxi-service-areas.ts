import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type RideServiceAreaCity = "Abuja" | "Kano";
export type RideCoordinate = { latitude: number; longitude: number };

type RideServiceAreaDefinition = {
  city: RideServiceAreaCity;
  aliases: string[];
  center: RideCoordinate;
  radiusMeters: number;
};

export type RideServiceAreaResolution = RideServiceAreaDefinition & {
  active: boolean;
};

export const RIDE_SERVICE_AREAS: RideServiceAreaDefinition[] = [
  {
    city: "Abuja",
    aliases: ["abuja", "fct", "abuja fct", "federal capital territory"],
    center: { latitude: 9.0765, longitude: 7.3986 },
    radiusMeters: 85_000
  },
  {
    city: "Kano",
    aliases: ["kano", "kano state"],
    center: { latitude: 12.0022, longitude: 8.592 },
    radiusMeters: 85_000
  }
];

export const INTERCITY_RIDES_UNAVAILABLE_MESSAGE = "Intercity KariGO Rides are not available yet. Choose pickup and destination within the same city.";
export const RIDES_AREA_UNAVAILABLE_MESSAGE = "KariGO Rides is not yet available in this pickup or destination area. Choose a pickup and destination in Kano or Abuja.";

export function activeRideServiceAreas(config: ConfigService): RideServiceAreaDefinition[] {
  const plural = parseServiceAreaNames(config.get<string>("RIDES_ACTIVE_SERVICE_AREAS", ""));
  const singular = parseServiceAreaNames(config.get<string>("RIDES_ACTIVE_SERVICE_AREA", "Abuja"));
  const pluralAreas = uniqueServiceAreas(plural);
  if (pluralAreas.length) return pluralAreas;
  const singularAreas = uniqueServiceAreas(singular);
  if (singularAreas.length) return singularAreas;
  return [RIDE_SERVICE_AREAS[0]];
}

function uniqueServiceAreas(names: string[]) {
  const seen = new Set<RideServiceAreaCity>();
  return names
    .map((name) => serviceAreaByName(name))
    .filter((area): area is RideServiceAreaDefinition => Boolean(area))
    .filter((area) => {
      if (seen.has(area.city)) return false;
      seen.add(area.city);
      return true;
    });
}

export function resolveRideServiceArea(config: ConfigService, latitude?: number, longitude?: number): RideServiceAreaResolution | null {
  if (!validRideCoordinate(latitude, longitude)) return null;
  const coordinate = { latitude: Number(latitude), longitude: Number(longitude) };
  const activeCities = new Set(activeRideServiceAreas(config).map((area) => area.city));
  const area = RIDE_SERVICE_AREAS.find((candidate) => distanceMeters(candidate.center, coordinate) <= candidate.radiusMeters);
  return area ? { ...area, active: activeCities.has(area.city) } : null;
}

export function serviceAreaCenter(config: ConfigService, serviceArea?: string, coordinate?: RideCoordinate): RideCoordinate {
  if (coordinate) {
    const resolved = resolveRideServiceArea(config, coordinate.latitude, coordinate.longitude);
    if (resolved?.active) return coordinate;
  }
  const named = serviceAreaByName(serviceArea);
  if (named && activeRideServiceAreas(config).some((area) => area.city === named.city)) return named.center;
  return activeRideServiceAreas(config)[0]?.center ?? RIDE_SERVICE_AREAS[0].center;
}

export function serviceAreaMetadata(config: ConfigService) {
  return activeRideServiceAreas(config).map((area) => ({
    city: area.city,
    center: area.center,
    radiusMeters: area.radiusMeters
  }));
}

export function assertSameActiveRideServiceArea(
  config: ConfigService,
  pickup: RideCoordinate,
  destination: RideCoordinate,
  stop?: RideCoordinate | null
) {
  const pickupArea = resolveRideServiceArea(config, pickup.latitude, pickup.longitude);
  const destinationArea = resolveRideServiceArea(config, destination.latitude, destination.longitude);
  const stopArea = stop ? resolveRideServiceArea(config, stop.latitude, stop.longitude) : null;
  if (!pickupArea?.active || !destinationArea?.active || (stop && !stopArea?.active)) {
    throw new BadRequestException(RIDES_AREA_UNAVAILABLE_MESSAGE);
  }
  if (pickupArea.city !== destinationArea.city || (stopArea && stopArea.city !== pickupArea.city)) {
    throw new BadRequestException(INTERCITY_RIDES_UNAVAILABLE_MESSAGE);
  }
  return {
    city: pickupArea.city,
    pickupServiceArea: pickupArea.city,
    destinationServiceArea: destinationArea.city,
    stopServiceArea: stopArea?.city ?? null,
    activeServiceAreas: activeRideServiceAreas(config).map((area) => area.city)
  };
}

export function rideCityFromText(config: ConfigService, ...values: Array<string | undefined | null>): RideServiceAreaCity | null {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  const named = serviceAreaByName(text);
  if (!named) return null;
  return activeRideServiceAreas(config).some((area) => area.city === named.city) ? named.city : null;
}

export function validRideCoordinate(latitude?: number, longitude?: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
}

function parseServiceAreaNames(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serviceAreaByName(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return RIDE_SERVICE_AREAS.find((area) => area.aliases.some((alias) => normalized === alias || normalized.includes(alias))) ?? null;
}

function distanceMeters(a: RideCoordinate, b: RideCoordinate) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}
