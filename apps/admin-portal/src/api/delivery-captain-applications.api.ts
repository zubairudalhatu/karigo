import { api } from "./client";

export type DeliveryCaptainApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "PROVISIONALLY_APPROVED"
  | "APPROVED"
  | "REJECTED";

export interface DeliveryCaptainApplication {
  id: string;
  applicationReference: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  address: string;
  preferredZone?: string | null;
  vehicleType: string;
  vehiclePlateNumber?: string | null;
  riderExperience?: string | null;
  guarantorName: string;
  guarantorPhone: string;
  notes?: string | null;
  status: DeliveryCaptainApplicationStatus;
  applicantVisibleNote?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryOnly: boolean;
  launchWarning: string;
}

export const deliveryCaptainApplicationsApi = {
  list: (status?: DeliveryCaptainApplicationStatus | "ALL") => {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<DeliveryCaptainApplication[]>(`admin/delivery-captain-applications${query}`);
  },
  review: (id: string, body: { status: DeliveryCaptainApplicationStatus; applicantVisibleNote?: string; adminNote?: string }) =>
    api.patch<DeliveryCaptainApplication>(`admin/delivery-captain-applications/${id}/review`, body)
};
