import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import { api } from "./client";

export const launchApi = { myAvailability: (city: string) => api.get<LaunchAvailabilityResponse>(`launch/availability/me?city=${encodeURIComponent(city)}`) };
