import type { CreateSupportTicketRequest, SupportTicketSummary } from "@karigo/shared-types";
import { api } from "./client";

export interface SupportTicket extends SupportTicketSummary {
  description: string;
  messages: Array<{ id: string; senderRole: string; message: string; createdAt: string }>;
}

export const supportApi = {
  create: (body: CreateSupportTicketRequest) => api.post<SupportTicket>("support/tickets", body),
  mine: () => api.get<SupportTicket[]>("support/tickets/my-tickets"),
  detail: (id: string) => api.get<SupportTicket>(`support/tickets/${id}`),
  message: (id: string, message: string) => api.post(`support/tickets/${id}/messages`, { message })
};
