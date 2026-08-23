import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  TaxiRideFinancialOutcome,
  TaxiRideFinancialResponsibility,
  TaxiRideRefundStatus,
  TaxiRideSettlementDirection,
  TaxiRideSettlementStatus
} from "@prisma/client";
import { RideFinanceService, calculateRideSettlementMoney } from "./ride-finance.service";

describe("Ride Finance money authority", () => {
  it.each([
    [170_000, 17_000, 153_000],
    [230_000, 23_000, 207_000],
    [270_000, 27_000, 243_000],
    [320_000, 32_000, 288_000],
    [400_000, 40_000, 360_000],
    [875_500, 87_550, 787_950]
  ])("freezes %i kobo at 10 percent without naira conversion drift", (fare, commission, captain) => {
    expect(calculateRideSettlementMoney(fare, 1_000)).toEqual({
      grossFareKobo: fare,
      karigoCommissionKobo: commission,
      captainNetEarningKobo: captain
    });
  });

  it("rounds once in integer kobo and includes paid waiting already present in the authoritative final fare", () => {
    expect(calculateRideSettlementMoney(400_005, 1_000)).toEqual({
      grossFareKobo: 400_005,
      karigoCommissionKobo: 40_001,
      captainNetEarningKobo: 360_004
    });
  });

  it("rejects unsafe, negative and non-integer monetary inputs", () => {
    expect(() => calculateRideSettlementMoney(-1, 1_000)).toThrow(BadRequestException);
    expect(() => calculateRideSettlementMoney(17.5, 1_000)).toThrow(BadRequestException);
    expect(() => calculateRideSettlementMoney(Number.MAX_SAFE_INTEGER, 1_000)).toThrow(BadRequestException);
  });
});

describe("RideFinanceService", () => {
  const config = { get: jest.fn((key: string, fallback?: unknown) => key === "RIDE_KARIGO_COMMISSION_PERCENT" ? 10 : fallback) };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const prisma: any = {
    $transaction: jest.fn(),
    taxiTrip: { findUnique: jest.fn() },
    taxiDriverProfile: { findUnique: jest.fn() },
    taxiRideSettlement: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    taxiRideCommissionRemittance: { findMany: jest.fn() }
  };
  const service = new RideFinanceService(prisma, config as any, audit as any, notifications as any);

  const baseSettlement = {
    id: "settlement-1",
    tripId: "trip-1",
    tripReference: "RIDE-209B-H11",
    driverProfileId: "driver-1",
    customerId: "customer-1",
    captainName: "Captain Ada",
    serviceArea: "Abuja",
    rideCategory: "ECONOMY",
    paymentMethod: "CASH",
    financialOutcome: TaxiRideFinancialOutcome.NORMAL_COMPLETION,
    grossFareKobo: 400_000,
    rideFareKobo: 360_000,
    waitingChargeKobo: 40_000,
    discountKobo: 0,
    finalCustomerFareKobo: 400_000,
    commissionRateBasisPoints: 1_000,
    karigoCommissionKobo: 40_000,
    captainGrossEarningKobo: 400_000,
    captainNetEarningKobo: 360_000,
    cashCollectedKobo: 400_000,
    platformReceivableKobo: 40_000,
    captainReceivableKobo: 0,
    remittedKobo: 0,
    refundedKobo: 0,
    platformAdjustmentKobo: 0,
    captainAdjustmentKobo: 0,
    settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM,
    status: TaxiRideSettlementStatus.PENDING,
    finalizedAt: new Date("2026-08-23T10:00:00.000Z"),
    createdAt: new Date("2026-08-23T10:00:00.000Z"),
    updatedAt: new Date("2026-08-23T10:00:00.000Z"),
    refunds: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) => key === "RIDE_KARIGO_COMMISSION_PERCENT" ? 10 : fallback);
    audit.record.mockResolvedValue(undefined);
    notifications.createNotification.mockResolvedValue(undefined);
  });

  it("creates an idempotent Cash settlement snapshot where Captain owes only KariGO commission and no payout", async () => {
    const tx: any = {
      taxiRideSettlement: { upsert: jest.fn().mockResolvedValue(baseSettlement) },
      taxiRideFinancialLedgerEntry: { createMany: jest.fn().mockResolvedValue({ count: 4 }) }
    };
    await service.createCompletedSettlement(tx, {
      tripId: "trip-1", tripReference: "RIDE-209B-H11", driverProfileId: "driver-1", customerId: "customer-1",
      captainName: "Captain Ada", serviceArea: "Abuja", rideCategory: "ECONOMY", paymentMethod: "CASH",
      rideFareKobo: 360_000, waitingChargeKobo: 40_000, discountKobo: 0, finalCustomerFareKobo: 400_000,
      finalizedAt: new Date("2026-08-23T10:00:00.000Z"), actorUserId: "captain-user"
    });
    expect(tx.taxiRideSettlement.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tripId: "trip-1" },
      update: {},
      create: expect.objectContaining({
        finalCustomerFareKobo: 400_000,
        karigoCommissionKobo: 40_000,
        captainNetEarningKobo: 360_000,
        cashCollectedKobo: 400_000,
        platformReceivableKobo: 40_000,
        captainReceivableKobo: 0,
        settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM
      })
    }));
    expect(tx.taxiRideFinancialLedgerEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    expect(tx.taxiRideFinancialLedgerEntry.createMany.mock.calls[0][0].data.map((entry: any) => entry.idempotencyKey)).toEqual([
      "ride-finance:trip-1:fare", "ride-finance:trip-1:captain-earning", "ride-finance:trip-1:commission", "ride-finance:trip-1:cash-collected"
    ]);
  });

  it("allocates a partial remittance FIFO and never invents a Captain payout", async () => {
    const first = { ...baseSettlement, id: "settlement-1", tripId: "trip-1", platformReceivableKobo: 40_000 };
    const second = { ...baseSettlement, id: "settlement-2", tripId: "trip-2", platformReceivableKobo: 60_000 };
    const tx: any = {
      taxiRideCommissionRemittance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "remit-1", amountKobo: 70_000 }) },
      taxiDriverProfile: { findUnique: jest.fn().mockResolvedValue({ id: "driver-1", userId: null, fullName: "Captain Ada" }) },
      taxiRideSettlement: { findMany: jest.fn().mockResolvedValue([first, second]), update: jest.fn().mockResolvedValue({}) },
      taxiRideCommissionRemittanceAllocation: { create: jest.fn().mockResolvedValue({}) },
      taxiRideFinancialLedgerEntry: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    const result = await service.recordRemittance("admin-1", { driverProfileId: "driver-1", amountKobo: 70_000, reference: "bank-209b", method: "bank transfer", reason: "Verified exceptional finance evidence" });
    expect(result.outstandingKobo).toBe(30_000);
    expect(tx.taxiRideCommissionRemittanceAllocation.create.mock.calls.map((call: any[]) => call[0].data.amountKobo)).toEqual([40_000, 30_000]);
    expect(tx.taxiRideSettlement.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ remittedKobo: 40_000, status: TaxiRideSettlementStatus.RECONCILED }) }));
    expect(tx.taxiRideSettlement.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ remittedKobo: 30_000, status: TaxiRideSettlementStatus.PARTIALLY_RECONCILED }) }));
  });

  it("rejects a duplicate remittance reference before any allocation", async () => {
    const tx: any = { taxiRideCommissionRemittance: { findUnique: jest.fn().mockResolvedValue({ id: "existing" }) } };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await expect(service.recordRemittance("admin-1", { driverProfileId: "driver-1", amountKobo: 1_000, reference: "same-ref", method: "cash", reason: "Verified exceptional finance evidence" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects remittance above the undisputed outstanding balance", async () => {
    const tx: any = {
      taxiRideCommissionRemittance: { findUnique: jest.fn().mockResolvedValue(null) },
      taxiDriverProfile: { findUnique: jest.fn().mockResolvedValue({ id: "driver-1", userId: null, fullName: "Captain Ada" }) },
      taxiRideSettlement: { findMany: jest.fn().mockResolvedValue([{ ...baseSettlement, platformReceivableKobo: 4_000 }]) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await expect(service.recordRemittance("admin-1", { driverProfileId: "driver-1", amountKobo: 4_001, reference: "too-much", method: "cash", reason: "Verified exceptional finance evidence" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a partial Cash refund obligation under review without mutating the original receipt", async () => {
    const tx: any = {
      taxiRideSettlement: { findUnique: jest.fn().mockResolvedValue({ ...baseSettlement, trip: { customer: { user: { id: "customer-user" } }, driverProfile: { userId: "captain-user" } } }), update: jest.fn().mockResolvedValue({}) },
      taxiRideRefund: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "refund-1", settlementId: "settlement-1", amountKobo: 50_000, responsibility: TaxiRideFinancialResponsibility.REVIEW_REQUIRED }) },
      taxiRideFinancialLedgerEntry: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    prisma.taxiTrip.findUnique.mockResolvedValue({ customer: { userId: "customer-user" } });
    await service.approveRefund("admin-1", "trip-1", { amountKobo: 50_000, idempotencyKey: "refund-key-1", reason: "Verified service issue" });
    expect(tx.taxiRideRefund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ responsibility: TaxiRideFinancialResponsibility.REVIEW_REQUIRED, platformResponsibilityKobo: 0, captainResponsibilityKobo: 0 }) });
    expect(tx.taxiRideSettlement.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refundedKobo: { increment: 50_000 }, status: TaxiRideSettlementStatus.DISPUTED }) }));
    expect(tx).not.toHaveProperty("rideReceipt.update");
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("₦500.00") }));
  });

  it("allows a full refund equal to the remaining original customer charge", async () => {
    const refund = {
      id: "refund-full",
      settlementId: "settlement-1",
      amountKobo: 400_000,
      responsibility: TaxiRideFinancialResponsibility.PLATFORM
    };
    const tx: any = {
      taxiRideSettlement: {
        findUnique: jest.fn().mockResolvedValue({ ...baseSettlement, trip: { customer: { user: { id: "customer-user" } }, driverProfile: null } }),
        update: jest.fn().mockResolvedValue({})
      },
      taxiRideRefund: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(refund) },
      taxiRideFinancialLedgerEntry: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    prisma.taxiTrip.findUnique.mockResolvedValue({ customer: { userId: "customer-user" } });
    await expect(service.approveRefund("admin-1", "trip-1", {
      amountKobo: 400_000,
      idempotencyKey: "refund-full-key",
      reason: "Full Cash refund approved",
      responsibility: TaxiRideFinancialResponsibility.PLATFORM
    })).resolves.toBe(refund);
    expect(tx.taxiRideRefund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountKobo: 400_000 }) });
    expect(tx.taxiRideSettlement.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ refundedKobo: { increment: 400_000 } }) }));
  });

  it("returns the existing refund for a repeated matching idempotency key without duplicate side effects", async () => {
    const existing = {
      id: "refund-existing",
      settlementId: "settlement-1",
      amountKobo: 50_000,
      responsibility: TaxiRideFinancialResponsibility.REVIEW_REQUIRED
    };
    const tx: any = {
      taxiRideSettlement: { findUnique: jest.fn().mockResolvedValue({ ...baseSettlement, trip: { customer: { user: { id: "customer-user" } }, driverProfile: null } }) },
      taxiRideRefund: { findUnique: jest.fn().mockResolvedValue(existing) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await expect(service.approveRefund("admin-1", "trip-1", {
      amountKobo: 50_000,
      idempotencyKey: "refund-existing-key",
      reason: "Repeated request"
    })).resolves.toBe(existing);
    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.createNotification).not.toHaveBeenCalled();
    expect(prisma.taxiTrip.findUnique).not.toHaveBeenCalled();
  });

  it("never permits cumulative refunds above the original customer charge", async () => {
    const tx: any = {
      taxiRideSettlement: { findUnique: jest.fn().mockResolvedValue({ ...baseSettlement, refundedKobo: 350_000, trip: { customer: { user: { id: "customer-user" } }, driverProfile: null } }) },
      taxiRideRefund: { findUnique: jest.fn().mockResolvedValue(null) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await expect(service.approveRefund("admin-1", "trip-1", { amountKobo: 50_001, idempotencyKey: "refund-key-2", reason: "Verified service issue" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allocates an ambiguous refund explicitly before financial review can resolve", async () => {
    const reviewRefund = {
      id: "refund-1", settlementId: "settlement-1", amountKobo: 50_000,
      status: TaxiRideRefundStatus.CASH_REFUND_DUE,
      responsibility: TaxiRideFinancialResponsibility.REVIEW_REQUIRED
    };
    const tx: any = {
      taxiRideRefund: {
        findUnique: jest.fn().mockResolvedValue({
          ...reviewRefund,
          settlement: { ...baseSettlement, trip: { id: "trip-1" }, driverProfile: { userId: null }, refunds: [reviewRefund] }
        }),
        update: jest.fn().mockResolvedValue({ ...reviewRefund, responsibility: TaxiRideFinancialResponsibility.SHARED, platformResponsibilityKobo: 20_000, captainResponsibilityKobo: 30_000 })
      },
      taxiRideSettlement: { update: jest.fn().mockResolvedValue({ ...baseSettlement, status: TaxiRideSettlementStatus.REFUND_PENDING }) },
      taxiRideFinancialLedgerEntry: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await service.allocateRefundResponsibility("admin-1", "refund-1", {
      responsibility: TaxiRideFinancialResponsibility.SHARED,
      platformResponsibilityKobo: 20_000,
      captainResponsibilityKobo: 30_000,
      resolutionNote: "Shared responsibility approved after Finance review"
    });
    expect(tx.taxiRideSettlement.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        platformAdjustmentKobo: { increment: -20_000 },
        captainAdjustmentKobo: { increment: -30_000 },
        status: TaxiRideSettlementStatus.REFUND_PENDING
      })
    }));
    expect(tx.taxiRideFinancialLedgerEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountKobo: 50_000, financialResponsibility: TaxiRideFinancialResponsibility.SHARED }) });
  });

  it("marks a Cash refund settled only after an explicit receipt reference and notification", async () => {
    const dueRefund = {
      id: "refund-1", settlementId: "settlement-1", amountKobo: 50_000,
      status: TaxiRideRefundStatus.CASH_REFUND_DUE,
      responsibility: TaxiRideFinancialResponsibility.PLATFORM,
      externalReference: null,
      note: null,
      settlement: {
        ...baseSettlement,
        trip: { customer: { userId: "customer-user" }, driverProfile: { userId: "captain-user" } }
      }
    };
    const settledRefund = { ...dueRefund, status: TaxiRideRefundStatus.CASH_REFUND_SETTLED, externalReference: "CASH-RECEIPT-1" };
    const tx: any = {
      taxiRideRefund: { findUnique: jest.fn().mockResolvedValue(dueRefund), update: jest.fn().mockResolvedValue(settledRefund), count: jest.fn().mockResolvedValue(0) },
      taxiRideFinancialLedgerEntry: { create: jest.fn().mockResolvedValue({}) },
      taxiRideSettlement: { update: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await service.settleCashRefund("admin-1", "refund-1", { reference: "cash-receipt-1", method: "cash", note: "Customer receipt verified" });
    expect(tx.taxiRideRefund.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideRefundStatus.CASH_REFUND_SETTLED, externalReference: "CASH-RECEIPT-1", method: "CASH", settledByUserId: "admin-1" })
    }));
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: "customer-user", message: expect.stringContaining("₦500.00") }));
  });

  it("prevents dispute resolution while refund responsibility remains unallocated", async () => {
    const tx: any = {
      taxiRideSettlement: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseSettlement,
          status: TaxiRideSettlementStatus.DISPUTED,
          refunds: [{ responsibility: TaxiRideFinancialResponsibility.REVIEW_REQUIRED }]
        })
      }
    };
    prisma.$transaction.mockImplementation(async (work: (transaction: any) => unknown) => work(tx));
    await expect(service.resolveDispute("admin-1", "trip-1", "Reviewed"))
      .rejects.toThrow("Allocate refund responsibility before resolving this financial review.");
  });

  it("uses customer ownership in settlement reads and does not expose another Customer's Ride", async () => {
    prisma.taxiRideSettlement.findFirst.mockResolvedValue(null);
    await expect(service.customerTripSummary("customer-user", "trip-1")).resolves.toBeNull();
    expect(prisma.taxiRideSettlement.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { tripId: "trip-1", customer: { userId: "customer-user" } } }));
  });

  it("uses the authenticated Captain profile as the statement boundary", async () => {
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(null);
    await expect(service.captainStatement("captain-user")).rejects.toThrow("Ride Captain finance profile not found.");
    expect(prisma.taxiDriverProfile.findUnique).toHaveBeenCalledWith({ where: { userId: "captain-user" }, select: { id: true, fullName: true } });
  });
});
