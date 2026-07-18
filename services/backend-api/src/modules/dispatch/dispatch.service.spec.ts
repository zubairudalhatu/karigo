import { BadRequestException } from "@nestjs/common";
import {
  AccountStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RiderJobRejectionReason } from "./dto/reject-rider-job.dto";
import { RiderAvailability } from "./dto/update-rider-availability.dto";
import { DispatchEventsService } from "./dispatch-events.service";
import { DispatchStatusService } from "./dispatch-status.service";
import { DispatchService } from "./dispatch.service";

describe("DispatchService", () => {
  const validDeliveryOtp = ["1", "2", "3", "4", "5", "6"].join("");
  const invalidDeliveryOtp = ["6", "5", "4", "3", "2", "1"].join("");
  const tx = {
    rider: { update: jest.fn() },
    order: { update: jest.fn() },
    riderEarning: { upsert: jest.fn() },
    vendorSettlement: { upsert: jest.fn() }
  };
  const prisma = {
    rider: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    riderEarning: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const events = { emit: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new DispatchService(
    prisma as unknown as PrismaService,
    new DispatchStatusService(),
    events as unknown as DispatchEventsService,
    audit as never
  );

  beforeEach(() => jest.clearAllMocks());

  it("only allows approved active riders to go online", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      id: "rider-1",
      verificationStatus: RiderStatus.PENDING_APPROVAL,
      availabilityStatus: RiderStatus.OFFLINE,
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    await expect(service.updateAvailability("rider-user-1", { availability: RiderAvailability.ONLINE }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("assigns an online rider to a ready order and records history", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      orderStatus: OrderStatus.READY_FOR_PICKUP
    });
    prisma.rider.findFirst.mockResolvedValue({ id: "rider-1", riderCode: "KGO-R-1" });
    tx.order.update.mockResolvedValue({ id: "order-1" });

    await service.assignRider("admin-1", "order-1", "rider-1");

    expect(tx.rider.update).toHaveBeenCalledWith({
      where: { id: "rider-1" },
      data: { availabilityStatus: RiderStatus.BUSY }
    });
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        riderId: "rider-1",
        orderStatus: OrderStatus.RIDER_ASSIGNED,
        deliveryOtp: expect.stringMatching(/^\d{6}$/),
        statusHistory: { create: expect.objectContaining({ changedByRole: "ADMIN" }) }
      })
    }));
  });

  it("returns a rejected assigned job to ready for pickup", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      id: "rider-1",
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderStatus: OrderStatus.RIDER_ASSIGNED
    });
    tx.order.update.mockResolvedValue({ id: "order-1" });

    const result = await service.rejectJob("rider-user-1", "order-1", {
      reason: RiderJobRejectionReason.TOO_FAR
    });

    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ riderId: null, orderStatus: OrderStatus.READY_FOR_PICKUP })
    }));
    expect(result.reassignmentRequired).toBe(true);
  });

  it("does not complete an order with the wrong delivery OTP", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      id: "rider-1",
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderStatus: OrderStatus.DELIVERED,
      deliveryOtp: validDeliveryOtp
    });

    await expect(service.completeJob("rider-user-1", "order-1", { deliveryOtp: invalidDeliveryOtp }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("updates rider location only while online or on delivery", async () => {
    prisma.rider.findUnique.mockResolvedValueOnce({
      id: "rider-1",
      availabilityStatus: RiderStatus.ONLINE,
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    prisma.rider.update.mockResolvedValue({ id: "rider-1" });

    await service.updateLocation("rider-user-1", { latitude: 12.0022, longitude: 8.592 });

    expect(prisma.rider.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentLatitude: new Prisma.Decimal(12.0022),
        currentLongitude: new Prisma.Decimal(8.592),
        currentLocationUpdatedAt: expect.any(Date)
      })
    }));

    prisma.rider.findUnique.mockResolvedValueOnce({
      id: "rider-1",
      availabilityStatus: RiderStatus.OFFLINE,
      user: { accountStatus: AccountStatus.ACTIVE }
    });

    await expect(service.updateLocation("rider-user-1", { latitude: 12.0022, longitude: 8.592 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("completes delivery and creates earning and vendor settlement records", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      id: "rider-1",
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      orderStatus: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.SUCCESSFUL,
      deliveryOtp: validDeliveryOtp,
      deliveryFee: new Prisma.Decimal(1000),
      subtotal: new Prisma.Decimal(5000),
      vendor: { commissionRate: new Prisma.Decimal(15) }
    });
    tx.order.update.mockResolvedValue({ id: "order-1" });

    await service.completeJob("rider-user-1", "order-1", { deliveryOtp: validDeliveryOtp });

    expect(tx.riderEarning.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        riderPayout: new Prisma.Decimal(1000),
        payoutStatus: SettlementStatus.PENDING
      })
    }));
    expect(tx.vendorSettlement.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        grossAmount: new Prisma.Decimal(5000),
        commissionAmount: new Prisma.Decimal(750),
        netAmount: new Prisma.Decimal(4250)
      })
    }));
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderStatus: OrderStatus.COMPLETED, deliveryOtp: null })
    }));
  });

  it("does not expose delivery OTP in rider job responses", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      id: "rider-1",
      user: { accountStatus: AccountStatus.ACTIVE }
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderStatus: OrderStatus.DELIVERED
    });

    await service.riderJob("rider-user-1", "order-1");

    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.not.objectContaining({ deliveryOtp: true })
    }));
  });
});
