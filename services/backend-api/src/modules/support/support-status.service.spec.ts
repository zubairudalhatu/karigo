import { BadRequestException } from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";
import { SupportStatusService } from "./support-status.service";

describe("SupportStatusService", () => {
  const service = new SupportStatusService();
  it("allows the standard support flow", () => {
    expect(() => service.assertTransition(SupportTicketStatus.OPEN, SupportTicketStatus.IN_REVIEW)).not.toThrow();
    expect(() => service.assertTransition(SupportTicketStatus.IN_REVIEW, SupportTicketStatus.WAITING_FOR_CUSTOMER)).not.toThrow();
    expect(() => service.assertTransition(SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED)).not.toThrow();
  });
  it("prevents invalid transitions", () => {
    expect(() => service.assertTransition(SupportTicketStatus.OPEN, SupportTicketStatus.CLOSED)).toThrow(BadRequestException);
  });
});
