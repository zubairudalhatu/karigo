import type { ApiRequestOptions } from "@karigo/config";
import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import type { CaptainLocation } from "../lib/location";
import { toTransientReadinessLocation } from "../lib/captain-readiness";
import { api } from "./client";
import { captainGetOptions } from "./reliable-get";

export const launchApi = {
  readiness: (city: string, location: CaptainLocation) => api.post<LaunchAvailabilityResponse>("launch/availability/me/captain", { city, ...toTransientReadinessLocation(location) }),
  myAvailability: (city: string, options?: ApiRequestOptions) => api.get<LaunchAvailabilityResponse>(`launch/availability/me/captain?city=${encodeURIComponent(city)}`, captainGetOptions(options)) };
