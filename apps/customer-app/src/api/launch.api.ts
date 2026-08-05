import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import { api } from "./client";

export const launchApi = {
  publicAvailability: (city: string) => api.get<LaunchAvailabilityResponse>(`launch/availability?city=${encodeURIComponent(city)}`),
  myAvailability: (city: string) => api.get<LaunchAvailabilityResponse>(`launch/availability/me?city=${encodeURIComponent(city)}`)
};
