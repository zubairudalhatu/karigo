export interface CreateSupportTicketRequest {
  category: string;
  subject: string;
  description: string;
  orderId?: string;
}

export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  createdAt: string;
}
