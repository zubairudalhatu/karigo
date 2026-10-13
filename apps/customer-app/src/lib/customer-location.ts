export type GeocodedPlace = {
  name?: string | null; street?: string | null; district?: string | null;
  city?: string | null; subregion?: string | null; region?: string | null;
};
export type Coordinate = { latitude: number; longitude: number };

// Same city centres/radii as backend taxi-service-areas.ts. This selects Home's
// city context only; backend launch availability still governs service access.
const launchAreas = [
  { city: "Abuja", latitude: 9.0765, longitude: 7.3986, radius: 85_000 },
  { city: "Kano", latitude: 12.0022, longitude: 8.592, radius: 85_000 }
] as const;

export function reverseGeocodeAddress(place?: GeocodedPlace | null) {
  return [place?.name, place?.street, place?.district, place?.city ?? place?.subregion, place?.region]
    .filter(Boolean).join(", ");
}

export function resolveHomeLocation(point: Coordinate, place?: GeocodedPlace | null) {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
    || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
    throw new Error("Invalid device location");
  }
  const radians = (value: number) => value * Math.PI / 180;
  const area = launchAreas.find((area) => {
    const a = Math.sin(radians(point.latitude - area.latitude) / 2) ** 2
      + Math.cos(radians(area.latitude)) * Math.cos(radians(point.latitude))
      * Math.sin(radians(point.longitude - area.longitude) / 2) ** 2;
    return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) <= area.radius;
  });
  return { city: area?.city ?? null, address: reverseGeocodeAddress(place), outsideServiceArea: !area };
}

export async function detectHomeLocation(dependencies: {
  permission: () => Promise<{ granted: boolean }>;
  position: () => Promise<{ coords: Coordinate }>;
  geocode: (point: Coordinate) => Promise<GeocodedPlace[]>;
}) {
  try {
    if (!(await dependencies.permission()).granted) return { status: "denied" } as const;
    const { coords } = await dependencies.position();
    // A geocoder outage must not invalidate valid coordinates, as in Ride.
    const [place] = await dependencies.geocode(coords).catch(() => []);
    return { status: "resolved", ...resolveHomeLocation(coords, place) } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}
