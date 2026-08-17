import { BadRequestException } from "@nestjs/common";
import {
  AccountStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  TaxiDriverProfileStatus,
  TaxiTripStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
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
    taxiDriverProfile: { findUnique: jest.fn() },
    taxiTrip: { findMany: jest.fn() },
    order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    riderEarning: { findMany: jest.fn() },
    captainWorkState: { updateMany: jest.fn() },
    deliveryCaptainApplication: { findFirst: jest.fn() },
    address: { findUnique: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const events = { emit: jest.fn() };
  const audit = { record: jest.fn() };
  const captainWorkState = {
    updateAvailability: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    transitionLock: jest.fn()
  };
  const launchOperations = { assertControlledSupplyCanReceive: jest.fn().mockResolvedValue(undefined), assertCaptainCanReceive: jest.fn().mockResolvedValue(undefined) };
  const service = new DispatchService(
    prisma as unknown as PrismaService,
    new DispatchStatusService(),
    events as unknown as DispatchEventsService,
    audit as never,
    captainWorkState as unknown as CaptainWorkStateService,
    launchOperations as never
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
      deliveryAddressId: "address-1",
      orderStatus: OrderStatus.READY_FOR_PICKUP
    });
    prisma.address.findUnique.mockResolvedValue({ city: "Kano", state: "Kano" });
    prisma.rider.findFirst.mockResolvedValue({ id: "rider-1", userId: "rider-user-1", riderCode: "KGO-R-1", currentLatitude: new Prisma.Decimal("12.0022"), currentLongitude: new Prisma.Decimal("8.592"), currentLocationUpdatedAt: new Date() });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValue({ operatingAreaIds: ["kano-kano", "fct-abuja"], primaryOperatingAreaId: "kano-kano", city: "Kano", state: "Kano", residentialCityCode: "KANO", residentialStateCode: "KANO" });
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

  it("allows an Abuja Delivery assignment for a Kano resident approved for both areas", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-abuja",
      deliveryAddressId: "address-abuja",
      orderStatus: OrderStatus.READY_FOR_PICKUP
    });
    prisma.address.findUnique.mockResolvedValue({ city: "Abuja", state: "FCT" });
    prisma.rider.findFirst.mockResolvedValue({
      id: "rider-1",
      userId: "rider-user-1",
      riderCode: "KGO-R-1",
      currentLatitude: new Prisma.Decimal("9.0765"),
      currentLongitude: new Prisma.Decimal("7.3986"),
      currentLocationUpdatedAt: new Date()
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValue({
      operatingAreaIds: ["kano-kano", "fct-abuja"],
      primaryOperatingAreaId: "kano-kano",
      city: "Kano",
      state: "Kano State"
    });
    tx.order.update.mockResolvedValue({ id: "order-abuja" });

    await expect(service.assignRider("admin-1", "order-abuja", "rider-1")).resolves.toBeDefined();
    expect(launchOperations.assertCaptainCanReceive).toHaveBeenCalledWith({ city: "Abuja", serviceType: "PARCEL_DELIVERY", userId: "rider-user-1" });
  });

  it("blocks an Abuja Delivery assignment when the approved application contains only Kano", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-abuja",
      deliveryAddressId: "address-abuja",
      orderStatus: OrderStatus.READY_FOR_PICKUP
    });
    prisma.address.findUnique.mockResolvedValue({ city: "Abuja", state: "FCT" });
    prisma.rider.findFirst.mockResolvedValue({
      id: "rider-1",
      userId: "rider-user-1",
      riderCode: "KGO-R-1",
      currentLatitude: new Prisma.Decimal("9.0765"),
      currentLongitude: new Prisma.Decimal("7.3986"),
      currentLocationUpdatedAt: new Date()
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValue({
      operatingAreaIds: ["kano-kano"],
      primaryOperatingAreaId: "kano-kano",
      city: "Kano",
      state: "Kano State"
    });

    await expect(service.assignRider("admin-1", "order-abuja", "rider-1"))
      .rejects.toThrow("Delivery Captain operating area does not match the delivery area.");
    expect(launchOperations.assertCaptainCanReceive).not.toHaveBeenCalled();
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

  it("returns zero earnings for a Ride-active Captain while Delivery activation is pending", async () => {
    prisma.rider.findUnique.mockResolvedValue(null);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue({
      id: "ride-profile-1",
      status: TaxiDriverProfileStatus.ACTIVE
    });
    prisma.taxiTrip.findMany.mockResolvedValue([]);

    const summary = await service.earnings("ride-user-1");

    expect(prisma.riderEarning.findMany).not.toHaveBeenCalled();
    expect(prisma.taxiTrip.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { driverProfileId: "ride-profile-1", status: TaxiTripStatus.COMPLETED }
    }));
    expect(summary.completedRidesCount).toBe(0);
    expect(summary.completedDeliveriesCount).toBe(0);
    expect(String(summary.totalEarnings)).toBe("0");
  });

  it("includes completed Ride records in the combined earnings summary", async () => {
    const completedAt = new Date();
    prisma.rider.findUnique.mockResolvedValue(null);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue({
      id: "ride-profile-1",
      status: TaxiDriverProfileStatus.ACTIVE
    });
    prisma.taxiTrip.findMany.mockResolvedValue([{
      id: "trip-1",
      tripReference: "KGO-RIDE-1",
      finalFareKobo: 350000,
      estimatedFareKobo: 330000,
      completedAt,
      createdAt: completedAt,
      status: TaxiTripStatus.COMPLETED
    }]);

    const summary = await service.earnings("ride-user-1");

    expect(summary.completedRidesCount).toBe(1);
    expect(summary.completedRides[0]).toMatchObject({
      id: "trip-1",
      tripReference: "KGO-RIDE-1",
      payoutStatus: "RECORDED"
    });
    expect(String(summary.totalEarnings)).toBe("3500");
  });
});
