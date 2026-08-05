import { BadRequestException } from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";
import { SupportStatusService } from "./support-status.service";

describe("SupportStatusService", () => {
  const service = new SupportStatusService();

  const validTransitions: Array<[SupportTicketStatus, SupportTicketStatus]> = [
    [SupportTicketStatus.OPEN, SupportTicketStatus.IN_REVIEW],
    [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.WAITING_FOR_CUSTOMER],
    [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.WAITING_FOR_VENDOR],
    [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.WAITING_FOR_RIDER],
    [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.RESOLVED],
    [SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.IN_REVIEW],
    [SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.RESOLVED],
    [SupportTicketStatus.WAITING_FOR_VENDOR, SupportTicketStatus.IN_REVIEW],
    [SupportTicketStatus.WAITING_FOR_VENDOR, SupportTicketStatus.RESOLVED],
    [SupportTicketStatus.WAITING_FOR_RIDER, SupportTicketStatus.IN_REVIEW],
    [SupportTicketStatus.WAITING_FOR_RIDER, SupportTicketStatus.RESOLVED],
    [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED],
    [SupportTicketStatus.RESOLVED, SupportTicketStatus.IN_REVIEW],
    [SupportTicketStatus.CLOSED, SupportTicketStatus.IN_REVIEW]
  ];

  it.each(validTransitions)("allows %s to move to %s", (current, next) => {
    expect(() => service.assertTransition(current, next)).not.toThrow();
  });

  it.each([
    [SupportTicketStatus.OPEN, SupportTicketStatus.CLOSED],
    [SupportTicketStatus.IN_REVIEW, SupportTicketStatus.CLOSED],
    [SupportTicketStatus.OPEN, SupportTicketStatus.RESOLVED],
    [SupportTicketStatus.CLOSED, SupportTicketStatus.RESOLVED]
  ])("prevents %s from moving directly to %s", (current, next) => {
    expect(() => service.assertTransition(current, next)).toThrow(BadRequestException);
  });
});
