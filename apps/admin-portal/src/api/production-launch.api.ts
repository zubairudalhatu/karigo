import { api } from "./client";

export type LaunchStage = "OFF" | "OPERATIONS_ONLY" | "INVITE_ONLY" | "LIMITED_PUBLIC" | "CITY_WIDE" | "PAUSED";
export type LaunchServiceType = "RIDES" | "FOOD" | "GROCERIES" | "MARKETPLACE" | "PARCEL_DELIVERY" | "SME_SERVICES";
export type ReadinessStatus = "NOT_READY" | "AT_RISK" | "READY" | "WAIVED";
export type ControlledSupplyGroupStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
export type ControlledSupplyMemberType = "RIDE_CAPTAIN" | "DELIVERY_CAPTAIN" | "DUAL_MODE_CAPTAIN" | "PRODUCT_SELLER" | "SERVICE_PROVIDER" | "MIXED_PARTNER";
export type OperationsChecklistStatus = "NOT_READY" | "COMPLETE" | "WAIVED";

export interface LaunchConfig {
  id: string;
  cityCode: string;
  cityName: string;
  serviceType: LaunchServiceType;
  launchStage: LaunchStage;
  isEnabled: boolean;
  operatingHours?: unknown;
  timezone?: string;
  allowedZoneIds?: unknown;
  maxConcurrentRequests?: number | null;
  maxUnassignedRequests?: number | null;
  minimumOnlineCaptainCount?: number | null;
  minimumOnlinePartnerCount?: number | null;
  customerMessage?: string | null;
  pausedReason?: string | null;
  inviteCohort?: { id: string; name: string; status: string } | null;
}

export interface LaunchCommandCentre {
  cities: Array<{
    city: { code: string; name: string };
    configs: LaunchConfig[];
    supply?: { captains: { ride: Record<string, number>; delivery: Record<string, number> }; partners: Record<string, number> };
    demand: Record<string, number>;
    readiness: { ready: number; total: number; percentage: number };
    openIncidents: number;
    lastSuccessfulOperationalTransaction?: { type: string; reference: string; at: string } | null;
  }>;
  supportMetrics: Record<string, number>;
  apiHealth: { status: string; checkedAt: string };
  generatedAt: string;
}

export interface LaunchReadiness {
  city: { code: string; name: string };
  score: { ready: number; total: number; percentage: number };
  finalDecisionRequired: boolean;
  items: Array<{ id: string; category: string; key: string; label: string; status: ReadinessStatus; note?: string | null; waiverReason?: string | null; waiverExpiresAt?: string | null }>;
}

export interface LaunchCohort {
  id: string;
  name: string;
  cityCode: string;
  maximumCustomers: number;
  status: string;
  notes?: string | null;
  members: Array<{ id: string; userId: string; status: string; invitedAt: string; reason?: string | null }>;
  _count?: { members: number };
}

export interface LaunchIncident { id: string; reference: string; severity: string; cityCode: string; serviceType?: LaunchServiceType | null; status: string; summary: string; mitigation?: string | null; createdAt: string; }
export interface LaunchDrillStep { id: string; key: string; label: string; position: number; status: "PENDING" | "PASSED" | "FAILED"; note?: string | null; }
export interface LaunchDrill { id: string; cityCode: string; drillType: string; serviceType?: LaunchServiceType | null; result: string; relatedReference?: string | null; notes?: string | null; controlledCustomerId?: string | null; controlledSupplyGroupId?: string | null; incidentId?: string | null; supportTicketId?: string | null; criticalFailure: boolean; steps: LaunchDrillStep[]; events: Array<{ id: string; eventType: string; note?: string | null; createdAt: string }>; createdAt: string; }
export interface LaunchSupportQueue { metrics: Record<string, number>; items: Array<{ id: string; ticketNumber: string; subject: string; priority: string; status: string; createdAt: string }>; }
export interface DailyLaunchReport { date: string; cities: Array<Record<string, string | number | object | null>>; generatedAt: string; privacy: string; }
export interface LaunchHistoryItem { id: string; previousStage: LaunchStage; newStage: LaunchStage; reason: string; adminUserId: string; createdAt: string; config: { cityCode: string; cityName: string; serviceType: LaunchServiceType }; }

export interface ControlledSupplyMember { id: string; memberType: ControlledSupplyMemberType; captainUserId?: string | null; vendorId?: string | null; enabled: boolean; activatedAt?: string | null; deactivatedAt?: string | null; reason?: string | null; }
export interface ControlledSupplyGroup { id: string; name: string; cityCode: string; serviceType: LaunchServiceType; status: ControlledSupplyGroupStatus; startAt?: string | null; endAt?: string | null; maximumMembers: number; internalNote?: string | null; activeWindow: boolean; members: ControlledSupplyMember[]; _count: { members: number }; }
export interface ControlledOperationsCustomer { id: string; cityCode: string; userId: string; label: string; enabled: boolean; excludedFromCampaigns: boolean; internalNote?: string | null; }
export interface ControlledCandidate { userId: string; vendorId?: string; captainName?: string; captainCode?: string; businessName?: string; tradingName?: string; city: string; capability?: string; rideStatus?: string; deliveryStatus?: string; onlineState: string; lastGpsUpdate?: string | null; vehicle?: string; activeRide?: boolean; activeDelivery?: boolean; activeProductCount?: number; activeServiceCount?: number; openOrderCount?: number; documentStatus: string; eligibility: string; blockers: string[]; controlledGroup?: { id: string; name: string; enabled: boolean; memberId: string } | null; }
export interface QuickLaunchCandidate {
  userId: string;
  vendorId?: string;
  name?: string;
  captainName?: string;
  businessName?: string;
  tradingName?: string;
  phoneNumber: string;
  customerCode?: string | null;
  captainCode?: string | null;
  partnerCode?: string | null;
  city: string;
  ready: boolean;
  blockerCodes?: string[];
  blockerMessages: string[];
  technicalId?: string;
  lastGpsUpdate?: string | null;
  capabilityLabel?: string;
  statusLabel?: string;
  cityReadiness?: string;
}
export interface QuickLaunchContext {
  requirements: { customer: true; captain: boolean; partner: boolean };
  manualChecklistReady: boolean;
  manualChecklistBlockers: string[];
  criticalFailures: number;
  currentStage: LaunchStage;
  stageSafeForQuickLaunch: boolean;
  automaticChecks: string[];
}
export interface QuickLaunchSession {
  city: { code: string; name: string };
  serviceType: LaunchServiceType;
  config: LaunchConfig;
  controlledGroup: { id: string; name: string };
  controlledCustomer: { id: string; label: string };
  drill: LaunchDrill;
}
export interface OperationsChecklist { city: { code: string; name: string }; serviceType: LaunchServiceType; items: Array<{ id: string; key: string; label: string; mandatory: boolean; status: OperationsChecklistStatus; note?: string | null; waiverReason?: string | null; waiverExpiresAt?: string | null }>; criticalFailures: number; canEnableOperationsOnly: boolean; score: { satisfied: number; total: number }; }
export interface ControlledReadiness { city: { code: string; name: string }; targets: Record<string, number>; requiredTargets: Record<string, number>; drillReady: boolean; inviteRolloutReady: false; limitedPublicReady: false; recommendation: string; }
export interface ControlledMonitor { city: { code: string; name: string }; refreshedAt: string; captains: Record<string, number | ControlledCandidate[]>; partners: Record<string, number | ControlledCandidate[]>; }

export const productionLaunchApi = {
  commandCentre: () => api.get<LaunchCommandCentre>("admin/production-launch/command-centre"),
  configs: () => api.get<LaunchConfig[]>("admin/production-launch/configs"),
  updateConfig: (city: string, serviceType: LaunchServiceType, payload: Record<string, unknown>) => api.patch<LaunchConfig>(`admin/production-launch/configs/${city}/${serviceType}`, payload),
  readiness: (city: string) => api.get<LaunchReadiness>(`admin/production-launch/readiness/${city}`),
  updateReadiness: (city: string, itemId: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/readiness/${city}/${itemId}`, payload),
  cohorts: () => api.get<LaunchCohort[]>("admin/production-launch/cohorts"),
  createCohort: (payload: Record<string, unknown>) => api.post<LaunchCohort>("admin/production-launch/cohorts", payload),
  updateCohort: (id: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/cohorts/${id}`, payload),
  addCohortMembers: (id: string, userIds: string[]) => api.post(`admin/production-launch/cohorts/${id}/members`, { userIds }),
  incidents: () => api.get<LaunchIncident[]>("admin/production-launch/incidents"),
  createIncident: (payload: Record<string, unknown>) => api.post<LaunchIncident>("admin/production-launch/incidents", payload),
  updateIncident: (id: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/incidents/${id}`, payload),
  pauseFromIncident: (id: string, reason: string) => api.post(`admin/production-launch/incidents/${id}/pause-service`, { confirmed: true, highImpactConfirmed: true, reason }),
  drills: () => api.get<LaunchDrill[]>("admin/production-launch/drills"),
  createDrill: (payload: Record<string, unknown>) => api.post<LaunchDrill>("admin/production-launch/drills", payload),
  updateDrill: (id: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/drills/${id}`, payload),
  supportQueue: () => api.get<LaunchSupportQueue>("admin/production-launch/support-queue"),
  report: (date?: string) => api.get<DailyLaunchReport>(`admin/production-launch/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  history: () => api.get<LaunchHistoryItem[]>("admin/production-launch/history"),
  controlledGroups: (city?: string) => api.get<ControlledSupplyGroup[]>(`admin/production-launch/controlled-groups${city ? `?city=${encodeURIComponent(city)}` : ""}`),
  createControlledGroup: (payload: Record<string, unknown>) => api.post<ControlledSupplyGroup>("admin/production-launch/controlled-groups", payload),
  updateControlledGroup: (id: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/controlled-groups/${id}`, payload),
  addControlledMember: (groupId: string, payload: Record<string, unknown>) => api.post(`admin/production-launch/controlled-groups/${groupId}/members`, payload),
  updateControlledMember: (groupId: string, memberId: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/controlled-groups/${groupId}/members/${memberId}`, payload),
  controlledCustomers: (city?: string) => api.get<ControlledOperationsCustomer[]>(`admin/production-launch/controlled-customers${city ? `?city=${encodeURIComponent(city)}` : ""}`),
  addControlledCustomer: (payload: Record<string, unknown>) => api.post("admin/production-launch/controlled-customers", payload),
  updateControlledCustomer: (id: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/controlled-customers/${id}`, payload),
  controlledCaptains: (city: string, serviceType: LaunchServiceType) => api.get<ControlledCandidate[]>(`admin/production-launch/controlled-captains?city=${encodeURIComponent(city)}&serviceType=${serviceType}`),
  controlledPartners: (city: string, serviceType: LaunchServiceType) => api.get<ControlledCandidate[]>(`admin/production-launch/controlled-partners?city=${encodeURIComponent(city)}&serviceType=${serviceType}`),
  operationsChecklist: (city: string, serviceType: LaunchServiceType) => api.get<OperationsChecklist>(`admin/production-launch/operations-checklist/${encodeURIComponent(city)}/${serviceType}`),
  updateOperationsChecklist: (city: string, serviceType: LaunchServiceType, itemId: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/operations-checklist/${encodeURIComponent(city)}/${serviceType}/${itemId}`, payload),
  controlledReadiness: () => api.get<ControlledReadiness[]>("admin/production-launch/controlled-readiness"),
  controlledMonitor: () => api.get<ControlledMonitor[]>("admin/production-launch/controlled-monitor"),
  controlledAudit: () => api.get<Array<Record<string, unknown>>>("admin/production-launch/controlled-audit"),
  quickLaunchContext: (city: string, serviceType: LaunchServiceType) => api.get<QuickLaunchContext>(`admin/production-launch/quick-launch/context?city=${encodeURIComponent(city)}&serviceType=${serviceType}`),
  quickLaunchCustomers: (city: string, query = "") => api.get<QuickLaunchCandidate[]>(`admin/production-launch/quick-launch/customers?city=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}`),
  quickLaunchCaptains: (city: string, serviceType: LaunchServiceType, query = "") => api.get<QuickLaunchCandidate[]>(`admin/production-launch/quick-launch/captains?city=${encodeURIComponent(city)}&serviceType=${serviceType}&query=${encodeURIComponent(query)}`),
  quickLaunchPartners: (city: string, serviceType: LaunchServiceType, query = "") => api.get<QuickLaunchCandidate[]>(`admin/production-launch/quick-launch/partners?city=${encodeURIComponent(city)}&serviceType=${serviceType}&query=${encodeURIComponent(query)}`),
  startQuickLaunch: (payload: Record<string, unknown>) => api.post<QuickLaunchSession>("admin/production-launch/quick-launch/start", payload),
  finishQuickLaunch: (drillId: string, payload: Record<string, unknown>) => api.post<{ drill: LaunchDrill; config?: LaunchConfig | null; serviceReturnedOff: boolean; activeTransactionsPreserved: true }>(`admin/production-launch/quick-launch/drills/${drillId}/finish`, payload),
  updateDrillStep: (drillId: string, stepId: string, payload: Record<string, unknown>) => api.patch(`admin/production-launch/drills/${drillId}/steps/${stepId}`, payload),
  reopenDrill: (drillId: string, reason: string) => api.post(`admin/production-launch/drills/${drillId}/reopen`, { reason }),
  drillFailureFollowUp: (drillId: string, payload: Record<string, unknown>) => api.post(`admin/production-launch/drills/${drillId}/failure-follow-up`, payload)
};
