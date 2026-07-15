import { NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorOrderRejectionReason } from "./dto/reject-vendor-order.dto";
import { VendorDashboardOrdersService } from "./vendor-dashboard-orders.service";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";

describe("VendorDashboardOrdersService", () => {
  const tx = {
    payment: { updateMany: jest.fn() },
    order: { update: jest.fn() }
  };
  const prisma = {
    vendor: { findFirst: jest.fn() },
    order: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const events = { emit: jest.fn() };
  const service = new VendorDashboardOrdersService(
    prisma as unknown as PrismaService,
    new VendorOrderStatusService(),
    events as unknown as VendorOrderEventsService
  );

  beforeEach(() => jest.clearAllMocks());

  it("scopes listings to the authenticated vendor profile", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.order.findMany.mockResolvedValue([]);

    await service.list("vendor-user-1", { status: OrderStatus.PAID });

    expect(prisma.vendor.findFirst).toHaveBeenCalledWith({
      where: { userId: "vendor-user-1", deletedAt: null },
      select: { id: true }
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ vendorId: "vendor-1", orderStatus: OrderStatus.PAID })
    }));
  });

  it("does not expose another vendor's order", async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.detail("vendor-user-1", "order-2")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "order-2", vendor: { userId: "vendor-user-1", deletedAt: null } }
    }));
  });

  it("accepts a paid owned order and records history", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      orderStatus: OrderStatus.PAID
    });
    prisma.order.update.mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      orderStatus: OrderStatus.VENDOR_ACCEPTED
    });

    await service.accept("vendor-user-1", "order-1");

    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderStatus: OrderStatus.VENDOR_ACCEPTED,
        statusHistory: {
          create: expect.objectContaining({
            previousStatus: OrderStatus.PAID,
            newStatus: OrderStatus.VENDOR_ACCEPTED,
            changedByRole: "VENDOR"
          })
        }
      })
    }));
    expect(events.emit).toHaveBeenCalledWith("vendor.order.accepted", "order-1", "vendor-1");
  });

  it("marks successful payments for refund review when a vendor rejects", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      orderStatus: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCESSFUL
    });
    tx.order.update.mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      orderStatus: OrderStatus.VENDOR_REJECTED
    });

    const result = await service.reject("vendor-user-1", "order-1", {
      reason: VendorOrderRejectionReason.ITEM_UNAVAILABLE
    });

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-1", paymentStatus: PaymentStatus.SUCCESSFUL },
      data: { paymentStatus: PaymentStatus.REFUND_PENDING }
    });
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderStatus: OrderStatus.VENDOR_REJECTED,
        paymentStatus: PaymentStatus.REFUND_PENDING,
        cancellationReason: "Vendor rejected order: ITEM_UNAVAILABLE"
      })
    }));
    expect(result.refundReviewRequired).toBe(true);
  });
});
