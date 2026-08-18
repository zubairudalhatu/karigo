import type { ApiRequestOptions } from "@karigo/config";
import { api } from "./client";
import { captainGetOptions } from "./reliable-get";

export interface RiderProfile {
  id: string;
  riderCode: string;
  phoneNumber: string;
  photoUrl?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  licenseNumber?: string | null;
  availabilityStatus: "ONLINE" | "OFFLINE" | "BUSY";
  verificationStatus: string;
  currentLatitude?: string | number | null;
  currentLongitude?: string | number | null;
  currentLocationUpdatedAt?: string | null;
  preferredServiceAreas?: string[] | null;
  totalDeliveries: number;
  user?: { fullName: string; email?: string | null };
}

export const riderApi = {
  profile: (options?: ApiRequestOptions) => api.get<RiderProfile>("riders/me", captainGetOptions(options)),
  updateProfile: (body: Partial<Pick<RiderProfile, "photoUrl" | "vehicleType" | "plateNumber" | "licenseNumber" | "preferredServiceAreas">>) => api.patch<RiderProfile>("riders/me", body),
  updateAvailability: (availability: "ONLINE" | "OFFLINE") => api.patch<RiderProfile>("rider/availability", { availability }),
  updateLocation: (latitude: number, longitude: number) => api.patch<RiderProfile>("rider/location", { latitude, longitude })
};
