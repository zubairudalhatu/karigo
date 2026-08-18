import type { ApiRequestOptions } from "@karigo/config";
import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import { api } from "./client";
import { captainGetOptions } from "./reliable-get";

export const launchApi = { myAvailability: (city: string, options?: ApiRequestOptions) => api.get<LaunchAvailabilityResponse>(`launch/availability/me?city=${encodeURIComponent(city)}`, captainGetOptions(options)) };
