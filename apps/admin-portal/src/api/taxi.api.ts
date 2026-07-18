import {
  TaxiApplicationStatus,
  TaxiDriverApplicationStatus,
  TaxiDriverProfile,
  TaxiDriverProfileStatus,
  TaxiRidePricingDefaults,
  TaxiTrip,
  TaxiWaitlistEntry,
  TaxiWaitlistStatus
} from "@karigo/shared-types";
import { api } from "./client";

export interface AdminTaxiDriverApplication extends TaxiDriverApplicationStatus {
  id: string;
  city: string;
  state: string;
  vehicle?: string | null;
  vehiclePlateNumber?: string | null;
  vehicleType?: string | null;
  vehicleOwnership?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTaxiDriverApplicationDetail extends AdminTaxiDriverApplication {
  email?: string | null;
  address?: string | null;
  driverLicenceNumber?: string | null;
  driverLicenceExpiry?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleColour?: string | null;
  notes?: string | null;
  adminNote?: string | null;
  launchWarning: string;
}

export const taxiApi = {
  driverApplications: (status?: TaxiApplicationStatus | "ALL") => {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<AdminTaxiDriverApplication[]>(`admin/taxi/driver-applications${query}`);
  },
  driverApplication: (id: string) => api.get<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}`),
  reviewDriverApplication: (id: string, body: { status: TaxiApplicationStatus; applicantVisibleNote?: string; adminNote?: string }) =>
    api.patch<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}/review`, body),
  waitlist: (status?: TaxiWaitlistStatus | "ALL") => {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<TaxiWaitlistEntry[]>(`admin/taxi/waitlist${query}`);
  },
  waitlistEntry: (id: string) => api.get<TaxiWaitlistEntry>(`admin/taxi/waitlist/${id}`),
  updateWaitlistStatus: (id: string, body: { status: TaxiWaitlistStatus; note?: string }) =>
    api.patch<TaxiWaitlistEntry>(`admin/taxi/waitlist/${id}/status`, body),
  driverProfiles: () => api.get<TaxiDriverProfile[]>("admin/taxi/driver-profiles"),
  createProfileFromApplication: (applicationId: string) =>
    api.post<TaxiDriverProfile>(`admin/taxi/driver-profiles/from-application/${applicationId}`),
  updateProfileStatus: (profileId: string, body: { status: TaxiDriverProfileStatus; note?: string }) =>
    api.patch<TaxiDriverProfile>(`admin/taxi/driver-profiles/${profileId}/status`, body),
  trips: () => api.get<TaxiTrip[]>("admin/taxi/trips"),
  trip: (tripId: string) => api.get<TaxiTrip>(`admin/taxi/trips/${tripId}`),
  assignDriver: (tripId: string, driverProfileId: string) =>
    api.patch<TaxiTrip>(`admin/taxi/trips/${tripId}/assign-driver`, { driverProfileId }),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`admin/taxi/trips/${tripId}/cancel`, { reason }),
  summary: () => api.get<{
    driverProfiles: number;
    availableDrivers: number;
    requestedTrips: number;
    activeTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    pricingDefaults: TaxiRidePricingDefaults;
    testModeNotice: string;
  }>("admin/taxi/summary")
};
