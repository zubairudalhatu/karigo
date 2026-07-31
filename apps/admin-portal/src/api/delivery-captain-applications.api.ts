import { api } from "./client";

export type DeliveryCaptainApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "PROVISIONALLY_APPROVED"
  | "APPROVED"
  | "REJECTED";

export interface DeliveryCaptainApplicationDocument {
  id: string;
  documentType: string;
  documentName?: string | null;
  documentUrl: string;
  verificationStatus: string;
}

export interface CaptainUploadedApplicationDocument {
  id: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: string;
  reviewStatus: string;
  uploadedAt: string;
  required: boolean;
  optional: boolean;
}

export interface CaptainLocationSummary {
  stateCode?: string | null;
  stateName?: string | null;
  cityCode?: string | null;
  cityName?: string | null;
  label?: string | null;
}

export interface DeliveryCaptainApplication {
  id: string;
  applicationReference: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  residentialLocation?: CaptainLocationSummary | null;
  operatingAreas?: CaptainLocationSummary[];
  primaryOperatingArea?: CaptainLocationSummary | null;
  address: string;
  preferredZone?: string | null;
  vehicleType: string;
  vehiclePlateNumber?: string | null;
  driverLicenceNumber?: string | null;
  riderExperience?: string | null;
  profilePhotoUrl?: string | null;
  guarantorName: string;
  guarantorPhone: string;
  notes?: string | null;
  status: DeliveryCaptainApplicationStatus;
  applicantVisibleNote?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: DeliveryCaptainApplicationDocument[];
  captainDocuments?: CaptainUploadedApplicationDocument[];
  applicantAccount?: {
    id: string;
    accountStatus: string;
    phoneVerified: boolean;
    passwordCreated: boolean;
    riderProfile?: { id: string; riderCode: string; verificationStatus: string } | null;
  } | null;
  deliveryOnly: boolean;
  launchWarning: string;
}

export const deliveryCaptainApplicationsApi = {
  list: (status?: DeliveryCaptainApplicationStatus | "ALL") => {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<DeliveryCaptainApplication[]>(`admin/delivery-captain-applications${query}`);
  },
  review: (id: string, body: { status: DeliveryCaptainApplicationStatus; applicantVisibleNote?: string; adminNote?: string }) =>
    api.patch<DeliveryCaptainApplication>(`admin/delivery-captain-applications/${id}/review`, body),
  documentView: (applicationId: string, documentId: string) =>
    api.get<{ viewUrl: string; expiresAt: string; document: CaptainUploadedApplicationDocument }>(`admin/delivery-captain-applications/${applicationId}/documents/${documentId}/view`)
};
