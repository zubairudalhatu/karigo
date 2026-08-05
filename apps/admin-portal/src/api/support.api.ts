import type { SupportTicketStatus } from "../lib/support-ticket-status";
import { api } from "./client";

export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AdminSupportTicketMessage {
  id: string;
  isInternalNote: boolean;
  message: string;
  senderRole: string;
}

export interface AdminSupportTicket {
  id: string;
  category: string;
  description: string;
  messages?: AdminSupportTicketMessage[];
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  subject: string;
  ticketNumber: string;
}

export const supportApi = {
  list: (query = "") => api.get<AdminSupportTicket[]>(`admin/support/tickets${query ? `?${query}` : ""}`),
  detail: (id: string) => api.get<AdminSupportTicket>(`admin/support/tickets/${id}`),
  assign: (id: string, adminUserId: string) => api.post(`admin/support/tickets/${id}/assign`, { adminUserId }),
  status: (id: string, status: SupportTicketStatus, priority?: SupportTicketPriority) =>
    api.patch<AdminSupportTicket>(`admin/support/tickets/${id}/status`, { status, priority }),
  message: (id: string, message: string, isInternalNote = false) =>
    api.post(`admin/support/tickets/${id}/messages`, { message, isInternalNote })
};
