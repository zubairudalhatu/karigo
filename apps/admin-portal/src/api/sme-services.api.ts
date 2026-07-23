import { api } from "./client";

export type ServiceProviderRequestStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PROVIDER_MATCHING"
  | "PROVIDER_ASSIGNED"
  | "COMPLETED"
  | "CANCELLED";

export type ServiceProviderType =
  | "PAINTER"
  | "PLUMBER"
  | "MECHANIC"
  | "ELECTRICIAN"
  | "CLEANER"
  | "CARPENTER"
  | "AC_TECHNICIAN"
  | "GENERATOR_REPAIR"
  | "APPLIANCE_REPAIR"
  | "FUMIGATION"
  | "WELDER"
  | "TILER"
  | "CCTV_TECHNICIAN"
  | "MOVING_HELP"
  | "PRINTING"
  | "CAR_HIRE"
  | "LAUNDRY"
  | "LESSON_TEACHER"
  | "LEGAL_PRACTITIONER"
  | "RENT_A_CAR"
  | "HEALTH_PROFESSIONAL"
  | "OTHER";

export type ServiceProviderStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "SUSPENDED"
  | "INACTIVE";

export type ServiceProviderApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED_TO_PROVIDER";

export type SmeServicesPilotDecisionStatus =
  | "NOT_REVIEWED"
  | "GO_INTERNAL_PILOT"
  | "CONDITIONAL_GO"
  | "NO_GO"
  | "DEFERRED";

export type SmeServicesPilotParticipantType =
  | "CUSTOMER"
  | "SERVICE_PROVIDER"
  | "INTERNAL_OBSERVER";

export type SmeServicesPilotParticipantStatus =
  | "DRAFT"
  | "READY_TO_INVITE"
  | "INVITED_MANUALLY"
  | "CONFIRMED"
  | "DECLINED"
  | "REMOVED";

export type SmeServicesPilotInvitationChannel =
  | "PHONE"
  | "WHATSAPP"
  | "EMAIL"
  | "IN_PERSON"
  | "IN_APP_NOTE"
  | "OTHER";

export interface SmeProvider {
  id: string;
  providerCode: string;
  fullName: string;
  businessName?: string | null;
  serviceType: ServiceProviderType;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  status: ServiceProviderStatus;
  readinessOnly: boolean;
  notes?: string | null;
  verificationNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmeProviderApplication {
  id: string;
  applicationReference: string;
  fullName: string;
  businessName?: string | null;
  serviceType: ServiceProviderType;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  address?: string | null;
  experienceSummary?: string | null;
  toolsOrEquipment?: string | null;
  availability?: string | null;
  identificationType?: string | null;
  identificationNumber?: string | null;
  status: ServiceProviderApplicationStatus;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByAdmin?: { id: string; fullName: string; email?: string | null } | null;
  convertedProvider?: Pick<SmeProvider, "id" | "providerCode" | "fullName" | "serviceType" | "status" | "readinessOnly"> | null;
}

export interface SmeProvidersListResponse {
  summary: {
    total: number;
    pendingReview: number;
    approved: number;
    suspended: number;
    inactive: number;
  };
  items: SmeProvider[];
}

export interface SmeServiceRequest {
  id: string;
  requestNumber: string;
  serviceType: ServiceProviderType;
  serviceLabel: string;
  description: string;
  contactPhone: string;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  customerNote?: string | null;
  status: ServiceProviderRequestStatus;
  readinessOnly: boolean;
  adminNote?: string | null;
  customerUpdateNote?: string | null;
  assignmentNote?: string | null;
  assignedAt?: string | null;
  assignedProvider?: SmeProvider | null;
  assignedByAdmin?: { id: string; fullName: string; email?: string | null };
  customer: {
    id: string;
    user: { id: string; fullName: string; phoneNumber: string; email?: string | null };
  };
  serviceAddress: {
    id: string;
    label: string;
    addressLine: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  reviewHistory?: Array<{
    id: string;
    action: string;
    newValue: unknown;
    createdAt: string;
    adminUser?: { fullName: string; email?: string | null } | null;
  }>;
}

export interface SmeServicesListResponse {
  summary: {
    total: number;
    submitted: number;
    underReview: number;
    providerMatching: number;
    providerAssigned: number;
    completed: number;
    cancelled: number;
  };
  items: SmeServiceRequest[];
}

export interface SmeServicesOperationsSummary {
  requests: {
    total: number;
    active: number;
    submitted: number;
    underReview: number;
    providerMatching: number;
    providerAssigned: number;
    completed: number;
    cancelled: number;
    readinessOnly: number;
  };
  providerApplications: {
    total: number;
    pending: number;
    submitted: number;
    underReview: number;
    changesRequested: number;
    approved: number;
    rejected: number;
    convertedToProvider: number;
    healthProfessionalReadiness: number;
  };
  providers: {
    total: number;
    pendingReview: number;
    approved: number;
    suspended: number;
    inactive: number;
    readinessOnly: number;
  };
  recent: {
    requests: Array<{
      id: string;
      reference: string;
      title: string;
      serviceType: ServiceProviderType;
      status: ServiceProviderRequestStatus;
      readinessOnly: boolean;
      customerName: string;
      createdAt: string;
      updatedAt: string;
    }>;
    applications: Array<{
      id: string;
      reference: string;
      title: string;
      businessName?: string | null;
      serviceType: ServiceProviderType;
      status: ServiceProviderApplicationStatus;
      submittedAt: string;
      updatedAt: string;
    }>;
    providers: Array<{
      id: string;
      reference: string;
      title: string;
      businessName?: string | null;
      serviceType: ServiceProviderType;
      status: ServiceProviderStatus;
      readinessOnly: boolean;
      city: string;
      state: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  guardrails: {
    liveDispatchEnabled: boolean;
    livePaymentsEnabled: boolean;
    providerLoginEnabled: boolean;
    providerPayoutEnabled: boolean;
    medicalBookingEnabled: boolean;
    note: string;
  };
}

export interface SmeServicesPilotReport {
  title: string;
  generatedAt: string;
  filename: string;
  format: "markdown";
  mimeType: "text/markdown";
  summary: SmeServicesOperationsSummary;
  markdown: string;
}

export interface SmeServicesPilotReadinessItem {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  isCompleted: boolean;
  note?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface SmeServicesPilotReadiness {
  status: "READY_FOR_INTERNAL_PILOT" | "NOT_READY";
  requiredTotal: number;
  requiredCompleted: number;
  optionalTotal: number;
  optionalCompleted: number;
  items: SmeServicesPilotReadinessItem[];
  systemSnapshot: {
    approvedProviders: number;
    pendingProviderApplications: number;
    activeRequests: number;
    readinessOnlyProviders: number;
    healthProfessionalReadinessApplications: number;
    approvedProvidersReady: boolean;
    providerQueueReady: boolean;
  };
  guardrails: SmeServicesOperationsSummary["guardrails"];
  safetyNote: string;
}

export interface SmeServicesPilotLaunchDecision {
  id: string;
  decisionStatus: SmeServicesPilotDecisionStatus;
  decisionTitle?: string | null;
  decisionSummary?: string | null;
  conditions?: string | null;
  blockers?: string | null;
  readinessStatusSnapshot: string;
  requiredCompletedSnapshot: number;
  requiredTotalSnapshot: number;
  optionalCompletedSnapshot: number;
  optionalTotalSnapshot: number;
  approvedProvidersSnapshot: number;
  pendingProviderApplicationsSnapshot: number;
  activeRequestsSnapshot: number;
  recordedByAdminId?: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmeServicesPilotLaunchControl {
  status: SmeServicesPilotDecisionStatus;
  readiness: SmeServicesPilotReadiness;
  latestDecision: SmeServicesPilotLaunchDecision | null;
  history: SmeServicesPilotLaunchDecision[];
  decisionOptions: SmeServicesPilotDecisionStatus[];
  guardrails: SmeServicesOperationsSummary["guardrails"];
  safetyNote: string;
}

export interface SmeServicesPilotParticipant {
  id: string;
  participantType: SmeServicesPilotParticipantType;
  status: SmeServicesPilotParticipantStatus;
  displayName: string;
  phoneNumber?: string | null;
  email?: string | null;
  organization?: string | null;
  city?: string | null;
  pilotZone?: string | null;
  relatedUserId?: string | null;
  relatedProviderId?: string | null;
  invitationChannel?: SmeServicesPilotInvitationChannel | null;
  invitationNote?: string | null;
  internalNotes?: string | null;
  consentConfirmed: boolean;
  safetyBriefingCompleted: boolean;
  invitedAt?: string | null;
  confirmedAt?: string | null;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmeServicesPilotParticipantsListResponse {
  summary: {
    total: number;
    customers: number;
    providers: number;
    observers: number;
    readyToInvite: number;
    invited: number;
    confirmed: number;
    declined: number;
    removed: number;
  };
  items: SmeServicesPilotParticipant[];
  guardrails: {
    liveInvitationsSent: boolean;
    liveDispatchEnabled: boolean;
    providerLoginEnabled: boolean;
    providerAppAccessEnabled: boolean;
    livePaymentsEnabled: boolean;
    note: string;
  };
}

export interface SmeServicesPilotInvitationTemplate {
  key: string;
  audience: string;
  title: string;
  subject: string;
  description: string;
  suggestedChannels: string[];
  requiredVariables: string[];
  messageTemplate: string;
  safetyNote: string;
}

export interface SmeServicesPilotInvitationTemplatesResponse {
  templates: SmeServicesPilotInvitationTemplate[];
  guardrails: {
    automatedSendingEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    pushEnabled: boolean;
    liveDispatchEnabled: boolean;
    livePaymentsEnabled: boolean;
    providerLoginEnabled: boolean;
    providerAppAccessEnabled: boolean;
    medicalBookingEnabled: boolean;
    note: string;
  };
  safetyNote: string;
}

export interface SmeServicesPilotInvitationPreview {
  template: SmeServicesPilotInvitationTemplate;
  preview: {
    subject: string;
    messageText: string;
    suggestedChannels: string[];
    copyInstructions: string;
    safetyNote: string;
  };
  variables: Record<string, string>;
}

export const smeServicesApi = {
  summary: () => api.get<SmeServicesOperationsSummary>("admin/service-provider-requests/summary"),
  report: () => api.get<SmeServicesPilotReport>("admin/service-provider-requests/report"),
  pilotReadiness: () => api.get<SmeServicesPilotReadiness>("admin/sme-services/pilot-readiness"),
  updatePilotReadiness: (items: Array<{ key: string; isCompleted: boolean; note?: string | null }>) =>
    api.patch<SmeServicesPilotReadiness>("admin/sme-services/pilot-readiness", { items }),
  pilotLaunchControl: () => api.get<SmeServicesPilotLaunchControl>("admin/sme-services/pilot-launch-control"),
  recordPilotLaunchDecision: (payload: {
    decisionStatus: SmeServicesPilotDecisionStatus;
    decisionTitle?: string;
    decisionSummary?: string;
    conditions?: string;
    blockers?: string;
  }) => api.post<SmeServicesPilotLaunchControl>("admin/sme-services/pilot-launch-control", payload),
  pilotParticipants: (q = "") => api.get<SmeServicesPilotParticipantsListResponse>(`admin/sme-services/pilot-participants${q ? `?${q}` : ""}`),
  createPilotParticipant: (payload: Partial<SmeServicesPilotParticipant>) => api.post<SmeServicesPilotParticipant>("admin/sme-services/pilot-participants", payload),
  pilotParticipant: (id: string) => api.get<SmeServicesPilotParticipant>(`admin/sme-services/pilot-participants/${id}`),
  updatePilotParticipant: (id: string, payload: Partial<SmeServicesPilotParticipant>) => api.patch<SmeServicesPilotParticipant>(`admin/sme-services/pilot-participants/${id}`, payload),
  pilotInvitationTemplates: () => api.get<SmeServicesPilotInvitationTemplatesResponse>("admin/sme-services/pilot-invitation-templates"),
  previewPilotInvitationTemplate: (payload: {
    templateKey: string;
    recipientName?: string;
    pilotZone?: string;
    pilotDate?: string;
    serviceFocus?: string;
    supportContact?: string;
    customNote?: string;
  }) => api.post<SmeServicesPilotInvitationPreview>("admin/sme-services/pilot-invitation-templates/preview", payload),
  list: (q = "") => api.get<SmeServicesListResponse>(`admin/service-provider-requests${q ? `?${q}` : ""}`),
  detail: (id: string) => api.get<SmeServiceRequest>(`admin/service-provider-requests/${id}`),
  status: (id: string, status: ServiceProviderRequestStatus, adminNote?: string, customerNote?: string) =>
    api.patch<SmeServiceRequest>(`admin/service-provider-requests/${id}/status`, { status, adminNote, customerNote }),
  assignProvider: (id: string, providerId: string, assignmentNote?: string) =>
    api.patch<SmeServiceRequest>(`admin/service-provider-requests/${id}/provider-assignment`, { providerId, assignmentNote }),
  providers: (q = "") => api.get<SmeProvidersListResponse>(`admin/service-providers${q ? `?${q}` : ""}`),
  provider: (id: string) => api.get<SmeProvider>(`admin/service-providers/${id}`),
  createProvider: (payload: Partial<SmeProvider>) => api.post<SmeProvider>("admin/service-providers", payload),
  updateProvider: (id: string, payload: Partial<SmeProvider>) => api.patch<SmeProvider>(`admin/service-providers/${id}`, payload),
  providerApplications: (q = "") => api.get<SmeProviderApplication[]>(`admin/service-provider-applications${q ? `?${q}` : ""}`),
  providerApplication: (id: string) => api.get<SmeProviderApplication>(`admin/service-provider-applications/${id}`),
  updateProviderApplicationStatus: (id: string, status: ServiceProviderApplicationStatus, reviewNote?: string) =>
    api.patch<SmeProviderApplication>(`admin/service-provider-applications/${id}/status`, { status, reviewNote }),
  approveCreateProviderFromApplication: (id: string, payload?: { reviewNote?: string; providerNote?: string; verificationNote?: string }) =>
    api.post<SmeProviderApplication>(`admin/service-provider-applications/${id}/approve-create-provider`, payload ?? {})
};
