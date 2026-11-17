import { api } from "./client";
export type TeamRole =
  | "MANAGER"
  | "ORDER_MANAGER"
  | "CATALOG_MANAGER"
  | "FINANCE"
  | "SUPPORT"
  | "VIEWER";
export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  area?: string | null;
  phoneNumber?: string | null;
  isPrimary: boolean;
  status: "ACTIVE" | "INACTIVE" | "CLOSED";
}
export type BranchInput = Omit<Branch, "id">;
export interface TeamMember {
  id: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: string;
  invitationStatus: string;
  expiresAt?: string | null;
}
export interface OperationsSummary {
  workspaceRole: string;
  canManageBranches: boolean;
  canManageTeamInvitations: boolean;
  canManageHours: boolean;
  staffAccessSupported: boolean;
  assignableTeamRoles: TeamRole[];
  branchCount: number;
  activeBranchCount: number;
  primary: { id: string; name: string } | null;
  teamCount: number;
  pendingInvitations: number;
  unreadNotifications: number;
}
export interface PartnerNotice {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
export type NoticeTarget =
  | { route: "order"; id: string }
  | { route: "earnings" | "profile" | "documents" | "support" };
export const operationsApi = {
  summary: () => api.get<OperationsSummary>("vendors/operations-summary"),
  branches: () => api.get<Branch[]>("vendors/branches"),
  createBranch: (body: BranchInput) =>
    api.post<Branch>("vendors/branches", body),
  updateBranch: (id: string, body: Partial<BranchInput>) =>
    api.patch<Branch>(`vendors/branches/${id}`, body),
  team: () => api.get<TeamMember[]>("vendors/team"),
  invite: (body: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    role: TeamRole;
  }) => api.post<TeamMember>("vendors/team", body),
  updateMember: (id: string, role: TeamRole) =>
    api.patch<TeamMember>(`vendors/team/${id}`, { role }),
  revoke: (id: string) =>
    api.patch<TeamMember>(`vendors/team/${id}/revoke`, {}),
  notices: (page = 1) =>
    api.get<PartnerNotice[]>(`vendors/notifications?page=${page}`),
  read: (id: string) => api.patch(`vendors/notifications/${id}/read`, {}),
  target: (id: string) =>
    api.get<NoticeTarget>(`vendors/notifications/${id}/target`),
};
