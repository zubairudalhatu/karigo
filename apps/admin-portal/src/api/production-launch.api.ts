import { api } from "./client";

export type LaunchStage = "OFF" | "OPERATIONS_ONLY" | "INVITE_ONLY" | "LIMITED_PUBLIC" | "CITY_WIDE" | "PAUSED";
export type LaunchServiceType = "RIDES" | "FOOD" | "GROCERIES" | "MARKETPLACE" | "PARCEL_DELIVERY" | "SME_SERVICES";
export type ReadinessStatus = "NOT_READY" | "AT_RISK" | "READY" | "WAIVED";

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
export interface LaunchDrill { id: string; cityCode: string; drillType: string; result: string; relatedReference?: string | null; notes?: string | null; createdAt: string; }
export interface LaunchSupportQueue { metrics: Record<string, number>; items: Array<{ id: string; ticketNumber: string; subject: string; priority: string; status: string; createdAt: string }>; }
export interface DailyLaunchReport { date: string; cities: Array<Record<string, string | number | object | null>>; generatedAt: string; privacy: string; }
export interface LaunchHistoryItem { id: string; previousStage: LaunchStage; newStage: LaunchStage; reason: string; adminUserId: string; createdAt: string; config: { cityCode: string; cityName: string; serviceType: LaunchServiceType }; }

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
  history: () => api.get<LaunchHistoryItem[]>("admin/production-launch/history")
};
