import { NotFoundException } from "@nestjs/common";
import { TaxiDriverProfileStatus } from "@prisma/client";
import { TaxiService } from "./taxi.service";

describe("Ride participant communication authorization", () => {
  const config: any = { get: jest.fn((key: string, fallback: unknown) => {
    const enabled: Record<string, unknown> = {
      RIDES_SERVICE_ENABLED: true,
      RIDES_PRODUCTION_ENABLED: true,
      RIDES_DISPATCH_MODE: "MANUAL",
      RIDES_PAYMENT_ENABLED: false
    };
    return enabled[key] ?? fallback;
  }) };
  const prisma: any = {
    customerProfile: { findUnique: jest.fn() },
    taxiDriverProfile: { findUnique: jest.fn() },
    taxiTrip: { findFirst: jest.fn() }
  };
  const communications: any = { listMessages: jest.fn() };
  const service = new TaxiService(
    prisma, {} as any, config, {} as any, {} as any, {} as any, {} as any, {} as any, communications
  );

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) => ({
      RIDES_SERVICE_ENABLED: true,
      RIDES_PRODUCTION_ENABLED: true,
      RIDES_DISPATCH_MODE: "MANUAL",
      RIDES_PAYMENT_ENABLED: false
    } as Record<string, unknown>)[key] ?? fallback);
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-profile" });
    prisma.taxiDriverProfile.findUnique.mockResolvedValue({ id: "driver-profile", status: TaxiDriverProfileStatus.ACTIVE });
    prisma.taxiTrip.findFirst.mockResolvedValue(null);
  });

  it("denies an unrelated Customer without revealing another Ride", async () => {
    await expect(service.customerRideMessages("unrelated-customer", "other-ride", { limit: 30 })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taxiTrip.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other-ride", customerId: "customer-profile" } }));
    expect(communications.listMessages).not.toHaveBeenCalled();
  });

  it("denies an unrelated Captain without revealing another Ride", async () => {
    await expect(service.riderRideMessages("unrelated-captain", "other-ride", { limit: 30 })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taxiTrip.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other-ride", driverProfileId: "driver-profile" } }));
    expect(communications.listMessages).not.toHaveBeenCalled();
  });
});
