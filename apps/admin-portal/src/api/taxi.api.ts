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

export interface CaptainLocationSummary {
  stateCode?: string | null;
  stateName?: string | null;
  cityCode?: string | null;
  cityName?: string | null;
  label?: string | null;
}

export interface CaptainUploadedApplicationDocument {
  id: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: string;
  reviewStatus: string;
  applicantVisibleNote?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
  required: boolean;
  optional: boolean;
  adminNote?: string | null;
}

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

export interface AdminTaxiDriverApplication extends TaxiDriverApplicationStatus {
  id: string;
  city: string;
  state: string;
  vehicle?: string | null;
  residentialLocation?: CaptainLocationSummary | null;
  operatingAreas?: CaptainLocationSummary[];
  primaryOperatingArea?: CaptainLocationSummary | null;
  vehiclePlateNumber?: string | null;
  vehicleType?: string | null;
  vehicleOwnership?: string | null;
  applicantAccount?: {
    userId?: string;
    id: string;
    accountRole?: string;
    accountStatus: string;
    phoneVerified: boolean;
    passwordCreated: boolean;
    loginReady?: boolean;
    deliveryProfileSummary?: { id: string; riderCode: string; verificationStatus: string } | null;
    riderProfile?: { id: string; riderCode: string; verificationStatus: string } | null;
  } | null;
  documentEvidence?: Array<{ label: string; url: string }>;
  captainDocuments?: CaptainUploadedApplicationDocument[];
  documentReview?: CaptainDocumentReviewSummary;
  createdAt: string;
  updatedAt: string;
  trashedAt?: string | null;
  trashedByAdminId?: string | null;
  trashReason?: string | null;
  restoredAt?: string | null;
  restoredByAdminId?: string | null;
}

export interface AdminTaxiDriverApplicationDetail extends AdminTaxiDriverApplication {
  email?: string | null;
  address?: string | null;
  driverLicenceNumber?: string | null;
  driverLicenceDocumentUrl?: string | null;
  driverLicenceExpiry?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleColour?: string | null;
  vehicleParticularsDocumentUrl?: string | null;
  insuranceDocumentUrl?: string | null;
  notes?: string | null;
  adminNote?: string | null;
  launchWarning: string;
}

export interface EligibleRideCaptain {
  id: string;
  fullName: string;
  captainCode: string;
  vehicle?: string | null;
  plateNumber?: string | null;
  operatingArea?: string | null;
  status: TaxiDriverProfileStatus;
  online: boolean;
  lastSeenAt?: string | null;
  locationFreshness: "fresh" | "stale" | "unavailable";
  distanceToPickupKm?: number | null;
  currentAssignment?: { id: string; tripReference: string; status: string } | null;
  eligible: boolean;
  ineligibilityReasons: string[];
}

export interface RideFinanceSummary {
  effectiveKarigoCommissionPercent: number;
  completedRides: number;
  grossRideFaresKobo: number;
  karigoCommissionKobo: number;
  captainEarningsKobo: number;
  cashCollectedByCaptainsKobo: number;
  platformCommissionOutstandingKobo: number;
  commissionReconciledKobo: number;
  refundsApprovedKobo: number;
  refundsPendingKobo: number;
  platformFundedRefundsKobo: number;
  captainFundedRefundsKobo: number;
  sharedRefundsKobo: number;
  unresolvedRefundResponsibilityKobo: number;
  unresolvedAdjustments: number;
  disputedBalanceKobo: number;
}

export interface RideFinanceRefund {
  id: string;
  amountKobo: number;
  status: "CASH_REFUND_DUE" | "CASH_REFUND_SETTLED";
  platformResponsibilityKobo: number;
  captainResponsibilityKobo: number;
  responsibility: "PLATFORM" | "CAPTAIN" | "SHARED" | "REVIEW_REQUIRED";
  approvedAt: string;
  settledAt?: string | null;
}

export interface RideFinanceSettlement {
  id: string;
  tripId: string;
  tripReference: string;
  finalizedAt: string;
  captain?: { id: string; fullName: string } | null;
  customerName: string;
  serviceArea?: string | null;
  rideCategory: string;
  paymentMethod: string;
  financialOutcome: string;
  finalCustomerFareKobo: number;
  rideFareKobo: number;
  originalCommissionEarnedKobo: number;
  waitingChargeKobo: number;
  discountKobo: number;
  commissionRateBasisPoints: number;
  karigoCommissionKobo: number;
  captainNetEarningKobo: number;
  cashCollectedKobo: number;
  platformReceivableKobo: number;
  remittedKobo: number;
  outstandingPlatformKobo: number;
  refundedKobo: number;
  platformFundedRefundsKobo: number;
  captainFundedRefundsKobo: number;
  unresolvedRefundResponsibilityKobo: number;
  settlementDirection: string;
  status: string;
  disputeReason?: string | null;
  refunds: RideFinanceRefund[];
}

export interface RideCaptainFinanceSummary {
  driverProfileId: string;
  captainName: string;
  grossFaresKobo: number;
  captainEarningsKobo: number;
  karigoCommissionDueKobo: number;
  commissionRemittedKobo: number;
  outstandingKobo: number;
  refundsKobo: number;
}

function financeQuery(dateFrom?: string, dateTo?: string) {
  const query = new URLSearchParams();
  if (dateFrom) query.set("dateFrom", `${dateFrom}T00:00:00+01:00`);
  if (dateTo) query.set("dateTo", `${dateTo}T23:59:59.999+01:00`);
  return query.size ? `?${query.toString()}` : "";
}

export interface RideCommissionPaymentHistory {
  id: string;
  reference: string;
  provider: string;
  providerReference?: string | null;
  amountKobo: number;
  currency: string;
  status: string;
  initiatedAt: string;
  verifiedAt?: string | null;
  captain: { id: string; fullName: string };
}

export const taxiApi = {
  driverApplications: (status?: TaxiApplicationStatus | "ALL") => {
    const query = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<AdminTaxiDriverApplication[]>(`admin/taxi/driver-applications${query}`);
  },
  driverApplicationsTrash: () => api.get<AdminTaxiDriverApplication[]>("admin/taxi/driver-applications/trash"),
  driverApplication: (id: string) => api.get<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}`),
  driverApplicationDocumentView: (applicationId: string, documentId: string) =>
    api.get<{ viewUrl: string; expiresAt: string; document: CaptainUploadedApplicationDocument }>(`admin/taxi/driver-applications/${applicationId}/documents/${documentId}/view`),
  reviewDriverApplicationDocument: (applicationId: string, documentId: string, body: { status: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"; applicantVisibleNote?: string; adminNote?: string }) =>
    api.patch<CaptainUploadedApplicationDocument>(`admin/taxi/driver-applications/${applicationId}/documents/${documentId}/review`, body),
  approveRequiredDriverApplicationDocuments: (applicationId: string) =>
    api.patch<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${applicationId}/documents/required/approve`, {}),
  reviewDriverApplication: (id: string, body: { status: TaxiApplicationStatus; applicantVisibleNote?: string; adminNote?: string }) =>
    api.patch<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}/review`, body),
  trashDriverApplication: (id: string, reason: string) =>
    api.patch<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}/trash`, { reason }),
  restoreDriverApplication: (id: string, reason: string) =>
    api.patch<AdminTaxiDriverApplicationDetail>(`admin/taxi/driver-applications/${id}/restore`, { reason }),
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
  eligibleDrivers: (tripId: string) => api.get<EligibleRideCaptain[]>(`admin/taxi/trips/${tripId}/eligible-drivers`),
  assignDriver: (tripId: string, driverProfileId: string) =>
    api.patch<TaxiTrip>(`admin/taxi/trips/${tripId}/assign-driver`, { driverProfileId }),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`admin/taxi/trips/${tripId}/cancel`, { reason }),
  retryReceiptEmail: (tripId: string) => api.post<{ status: string; attemptCount: number }>(`admin/taxi/trips/${tripId}/receipt-email/retry`),
  summary: () => api.get<{
    driverProfiles: number;
    availableDrivers: number;
    requestedTrips: number;
    activeTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    pricingDefaults: TaxiRidePricingDefaults;
    launchNotice?: string;
    testModeNotice?: string;
  }>("admin/taxi/summary"),
  financeSummary: (dateFrom?: string, dateTo?: string) => api.get<RideFinanceSummary>(`admin/taxi/finance/summary${financeQuery(dateFrom, dateTo)}`),
  financeSettlements: (dateFrom?: string, dateTo?: string) => api.get<RideFinanceSettlement[]>(`admin/taxi/finance/settlements${financeQuery(dateFrom, dateTo)}`),
  financeCaptains: (dateFrom?: string, dateTo?: string) => api.get<RideCaptainFinanceSummary[]>(`admin/taxi/finance/captains${financeQuery(dateFrom, dateTo)}`),
  financeExport: (dateFrom?: string, dateTo?: string) => api.get<{ fileName: string; csv: string }>(`admin/taxi/finance/export${financeQuery(dateFrom, dateTo)}`),
  recordCommissionRemittance: (body: { driverProfileId: string; amountKobo: number; reference: string; method: string; reason: string; remittedAt?: string; note?: string }) => api.post("admin/taxi/finance/remittances", body),
  approveCashRefund: (tripId: string, body: { amountKobo: number; idempotencyKey: string; reason: string; responsibility?: "PLATFORM" | "CAPTAIN" | "SHARED" | "REVIEW_REQUIRED"; platformResponsibilityKobo?: number; captainResponsibilityKobo?: number; note?: string }) => api.post<RideFinanceRefund>(`admin/taxi/trips/${tripId}/refunds`, body),
  settleCashRefund: (refundId: string, body: { reference: string; method: string; note?: string }) => api.post<RideFinanceRefund>(`admin/taxi/refunds/${refundId}/settle`, body),
  commissionPaymentHistory: () => api.get<RideCommissionPaymentHistory[]>("admin/taxi/finance/commission-payments"),
  allocateRefundResponsibility: (refundId: string, body: { responsibility: "PLATFORM" | "CAPTAIN" | "SHARED"; platformResponsibilityKobo?: number; captainResponsibilityKobo?: number; resolutionNote: string }) => api.patch<RideFinanceRefund>(`admin/taxi/refunds/${refundId}/responsibility`, body),
  createFinancialAdjustment: (tripId: string, body: { amountKobo: number; direction: "CREDIT" | "DEBIT"; target: "PLATFORM_RECEIVABLE" | "CAPTAIN_EARNING"; responsibility: "PLATFORM" | "CAPTAIN" | "SHARED" | "REVIEW_REQUIRED"; idempotencyKey: string; reason: string; note?: string }) => api.post(`admin/taxi/trips/${tripId}/adjustments`, body),
  openFinancialDispute: (tripId: string, reason: string, note?: string) => api.post(`admin/taxi/trips/${tripId}/dispute`, { reason, note }),
  resolveFinancialDispute: (tripId: string, resolutionNote: string) => api.post(`admin/taxi/trips/${tripId}/dispute/resolve`, { resolutionNote })
};
