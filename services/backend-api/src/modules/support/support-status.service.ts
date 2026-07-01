import { BadRequestException, Injectable } from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";

const TRANSITIONS: Partial<Record<SupportTicketStatus, SupportTicketStatus[]>> = {
  OPEN: [SupportTicketStatus.IN_REVIEW],
  IN_REVIEW: [
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.WAITING_FOR_VENDOR,
    SupportTicketStatus.WAITING_FOR_RIDER,
    SupportTicketStatus.RESOLVED
  ],
  WAITING_FOR_CUSTOMER: [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.RESOLVED],
  WAITING_FOR_VENDOR: [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.RESOLVED],
  WAITING_FOR_RIDER: [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.RESOLVED],
  RESOLVED: [SupportTicketStatus.CLOSED, SupportTicketStatus.IN_REVIEW],
  CLOSED: [SupportTicketStatus.IN_REVIEW]
};

@Injectable()
export class SupportStatusService {
  assertTransition(current: SupportTicketStatus, next: SupportTicketStatus) {
    if (!TRANSITIONS[current]?.includes(next)) {
      throw new BadRequestException(`Ticket cannot move from ${current} to ${next}`);
    }
  }
}
