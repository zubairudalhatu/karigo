import { api } from "./client";

export type DeliveryCaptainVehicleType = "MOTORCYCLE" | "BICYCLE" | "TRICYCLE" | "CAR" | "VAN" | "OTHER";

export interface CaptainDocumentReviewSummary {
  stage: "DOCUMENTS_MISSING" | "DOCUMENTS_RECEIVED" | "DOCUMENTS_UNDER_REVIEW" | "CHANGES_REQUESTED" | "DOCUMENTS_APPROVED";
  message: string;
  requiredDocumentTypes: string[];
  missingRequiredDocumentTypes: string[];
  pendingRequiredDocumentTypes: string[];
  changesRequestedRequiredDocumentTypes: string[];
  rejectedRequiredDocumentTypes: string[];
  requiredDocumentsApproved: boolean;
  approvalReviewIncomplete: boolean;
}

export interface DeliveryCaptainApplicationInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  state: string;
  residentialStateCode?: string;
  residentialCityCode?: string;
  operatingAreaIds?: string[];
  primaryOperatingAreaId?: string;
  address: string;
  preferredZone?: string;
  vehicleType: DeliveryCaptainVehicleType;
  vehiclePlateNumber?: string;
  driverLicenceNumber?: string;
  riderExperience?: string;
  profilePhotoUrl?: string;
  documents?: Array<{
    documentType: string;
    documentName?: string;
    documentUrl: string;
  }>;
  documentIds?: string[];
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
  exists?: boolean;
  nextStep?: string;
  operationalAccess?: boolean;
  applicationAccountRole?: string | null;
  documentReview?: CaptainDocumentReviewSummary;
}

export const deliveryCaptainApplicationsApi = {
  submit: (body: DeliveryCaptainApplicationInput) =>
    api.post<DeliveryCaptainApplicationStatus>("delivery-captain-applications", body, { authenticated: false }),
  submitForCurrentUser: (body: DeliveryCaptainApplicationInput) =>
    api.post<DeliveryCaptainApplicationStatus>("delivery-captain-applications/me", body),
  status: (phoneNumber: string) =>
    api.get<DeliveryCaptainApplicationStatus>(`delivery-captain-applications/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false }),
  statusForCurrentUser: () => api.get<DeliveryCaptainApplicationStatus>("delivery-captain-applications/me")
};
