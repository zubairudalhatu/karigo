export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_VENDOR",
  "WAITING_FOR_RIDER",
  "RESOLVED",
  "CLOSED"
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_TRANSITIONS: Record<SupportTicketStatus, readonly SupportTicketStatus[]> = {
  OPEN: ["IN_REVIEW"],
  IN_REVIEW: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_VENDOR", "WAITING_FOR_RIDER", "RESOLVED"],
  WAITING_FOR_CUSTOMER: ["IN_REVIEW", "RESOLVED"],
  WAITING_FOR_VENDOR: ["IN_REVIEW", "RESOLVED"],
  WAITING_FOR_RIDER: ["IN_REVIEW", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_REVIEW"],
  CLOSED: ["IN_REVIEW"]
};

export function nextSupportTicketStatuses(current: SupportTicketStatus) {
  return SUPPORT_TICKET_STATUS_TRANSITIONS[current];
}
