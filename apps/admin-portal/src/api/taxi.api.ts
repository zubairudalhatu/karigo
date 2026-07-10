import { TaxiApplicationStatus, TaxiDriverApplicationStatus, TaxiWaitlistEntry, TaxiWaitlistStatus } from "@karigo/shared-types";
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
    api.patch<TaxiWaitlistEntry>(`admin/taxi/waitlist/${id}/status`, body)
};
