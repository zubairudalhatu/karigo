export function captainTripMapAllowed(platform: string, waypoints: ReadonlyArray<{ coordinate: unknown; source?: string | null }>) {
  // Apple Maps may show device/user-supplied coordinates, never Google-derived
  // or unknown trip content. Android retains its existing Google Maps flow.
  return platform !== "ios" || waypoints.every(point => !point.coordinate || point.source === "USER_SUPPLIED");
}
