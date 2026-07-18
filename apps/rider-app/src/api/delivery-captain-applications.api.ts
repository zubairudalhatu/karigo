import { api } from "./client";

export type DeliveryCaptainVehicleType = "MOTORCYCLE" | "BICYCLE" | "TRICYCLE" | "CAR" | "VAN" | "OTHER";

export interface DeliveryCaptainApplicationInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  state: string;
  address: string;
  preferredZone?: string;
  vehicleType: DeliveryCaptainVehicleType;
  vehiclePlateNumber?: string;
  riderExperience?: string;
  profilePhotoUrl?: string;
  documents?: Array<{
    documentType: string;
    documentName?: string;
    documentUrl: string;
  }>;
  guarantorName: string;
  guarantorPhone: string;
  notes?: string;
  declarationAccepted: boolean;
  privacyAccepted: boolean;
  contactConsentAccepted: boolean;
}

export interface DeliveryCaptainApplicationStatus {
  applicationReference: string;
  fullName: string;
  phoneNumber: string;
  status: string;
  applicantVisibleNote?: string | null;
  message: string;
  submittedAt: string;
  reviewedAt?: string | null;
  deliveryOnly: boolean;
  pilotCity: string;
  createsLogin: boolean;
  activatesDispatch: boolean;
  payoutActivation: boolean;
}

export const deliveryCaptainApplicationsApi = {
  submit: (body: DeliveryCaptainApplicationInput) =>
    api.post<DeliveryCaptainApplicationStatus>("delivery-captain-applications", body, { authenticated: false }),
  status: (phoneNumber: string) =>
    api.get<DeliveryCaptainApplicationStatus>(`delivery-captain-applications/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false })
};
