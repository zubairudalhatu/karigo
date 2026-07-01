import { NotFoundException } from "@nestjs/common";
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SupportService } from "./support.service";
import { SupportStatusService } from "./support-status.service";

describe("SupportService", () => {
  const tx = { supportTicketMessage: { create: jest.fn() }, supportTicket: { update: jest.fn() } };
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
    supportTicket: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    supportTicketMessage: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new SupportService(prisma as unknown as PrismaService, new SupportStatusService(), audit as never, notifications as never);

  beforeEach(() => jest.clearAllMocks());

  it("validates ownership of an order-linked customer ticket", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.create("user-1", {
      category: SupportTicketCategory.ORDER_DELAY,
      subject: "Late order",
      description: "My order is delayed",
      orderId: "order-2"
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("defaults payment issues to high priority", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
    prisma.supportTicket.create.mockImplementation(({ data }) => data);
    const result = await service.create("user-1", {
      category: SupportTicketCategory.PAYMENT_ISSUE,
      subject: "Payment issue",
      description: "Payment was charged twice"
    });
    expect(result.priority).toBe(SupportTicketPriority.HIGH);
    expect(result.status).toBe(SupportTicketStatus.OPEN);
  });

  it("returns only customer-visible messages to a customer", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
    prisma.supportTicket.findFirst.mockResolvedValue({ id: "ticket-1" });
    await service.customerDetail("user-1", "ticket-1");
    expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ messages: expect.objectContaining({ where: { isInternalNote: false } }) })
    }));
  });
});
