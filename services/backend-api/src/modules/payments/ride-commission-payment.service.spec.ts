import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  Prisma,
  TaxiRideCommissionPaymentStatus,
  TaxiRideCommissionRemittanceSource,
  TaxiRideFinancialOutcome,
  TaxiRideSettlementDirection,
  TaxiRideSettlementStatus
} from "@prisma/client";
import { RideCommissionPaymentService } from "./ride-commission-payment.service";

describe("RideCommissionPaymentService", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  const intent = {
    id: "commission-payment-1",
    driverProfileId: "driver-profile-1",
    purpose: "RIDE_COMMISSION_REMITTANCE",
    provider: "flutterwave",
    transactionReference: "KGO-RIDE-FEE-209B-H111",
    providerTransactionReference: null,
    amountKobo: 1_250_000,
    currency: "NGN",
    status: TaxiRideCommissionPaymentStatus.INITIALIZED,
    remittanceId: null,
    failureReason: null,
    initiatedAt: now,
    initializedAt: now,
    verifiedAt: null,
    failedAt: null,
    expiresAt: new Date("2026-08-24T12:00:00.000Z"),
    createdAt: now,
    updatedAt: now
  };
  const settlement = {
    id: "settlement-1",
    tripId: "trip-1",
    driverProfileId: "driver-profile-1",
    financialOutcome: TaxiRideFinancialOutcome.NORMAL_COMPLETION,
    settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM,
    status: TaxiRideSettlementStatus.PENDING,
    platformReceivableKobo: 1_250_000,
    platformAdjustmentKobo: 0,
    remittedKobo: 0,
    finalizedAt: now,
    refunds: []
  };
  const successfulEvidence = {
    transactionReference: intent.transactionReference,
    successful: true,
    amountMinor: intent.amountKobo,
    currency: "NGN",
    providerResponse: { data: { flw_ref: "FLW-VERIFIED-209B-H111" } }
  };
  const successfulPayment = {
    ...intent,
    status: TaxiRideCommissionPaymentStatus.SUCCESSFUL,
    providerTransactionReference: "FLW-VERIFIED-209B-H111",
    remittanceId: "remittance-1",
    verifiedAt: now
  };

  const tx: any = {
    paymentWebhookLog: { create: jest.fn() },
    taxiRideCommissionPayment: { findUnique: jest.fn(), update: jest.fn() },
    taxiDriverProfile: { findUnique: jest.fn() },
    taxiRideSettlement: { findMany: jest.fn(), update: jest.fn() },
    taxiRideCommissionRemittance: { create: jest.fn() },
    taxiRideCommissionRemittanceAllocation: { create: jest.fn() },
    taxiRideFinancialLedgerEntry: { create: jest.fn() },
    taxiCaptainPayout: { create: jest.fn() }
  };
  const prisma: any = {
    taxiDriverProfile: { findUnique: jest.fn() },
    taxiRideSettlement: { findMany: jest.fn() },
    taxiRideCommissionPayment: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    $transaction: jest.fn()
  };
  const provider = {
    name: "flutterwave" as const,
    initialize: jest.fn(),
    verify: jest.fn(),
    parseWebhook: jest.fn()
  };
  const providers = { get: jest.fn(() => provider) };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        RIDE_CAPTAIN_COMMISSION_PAYMENT_ENABLED: true,
        RIDE_CAPTAIN_COMMISSION_PAYMENT_PROVIDER: "flutterwave"
      };
      return values[key] ?? fallback;
    })
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new RideCommissionPaymentService(prisma, providers as any, config as any, audit as any, notifications as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        RIDE_CAPTAIN_COMMISSION_PAYMENT_ENABLED: true,
        RIDE_CAPTAIN_COMMISSION_PAYMENT_PROVIDER: "flutterwave"
      };
      return values[key] ?? fallback;
    });
    providers.get.mockReturnValue(provider);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue({
      id: "driver-profile-1",
      user: { email: "captain@example.test", phoneNumber: "+2348030000000" }
    });
    prisma.taxiRideSettlement.findMany.mockResolvedValue([settlement]);
    prisma.taxiRideCommissionPayment.create.mockResolvedValue({ ...intent, status: TaxiRideCommissionPaymentStatus.PENDING });
    prisma.taxiRideCommissionPayment.update.mockResolvedValue(intent);
    prisma.taxiRideCommissionPayment.findFirst.mockResolvedValue(intent);
    prisma.taxiRideCommissionPayment.findUnique.mockResolvedValue(intent);
    provider.initialize.mockResolvedValue({
      transactionReference: intent.transactionReference,
      authorizationUrl: "https://checkout.flutterwave.com/v3/hosted/pay/209b-h111",
      accessCode: null,
      providerResponse: {}
    });
    provider.verify.mockResolvedValue(successfulEvidence);
    tx.paymentWebhookLog.create.mockResolvedValue({ id: "webhook-log-1" });
    tx.taxiRideCommissionPayment.findUnique.mockResolvedValue(intent);
    tx.taxiDriverProfile.findUnique.mockResolvedValue({ id: "driver-profile-1", userId: "captain-user-1" });
    tx.taxiRideSettlement.findMany.mockResolvedValue([settlement]);
    tx.taxiRideCommissionRemittance.create.mockResolvedValue({ id: "remittance-1" });
    tx.taxiRideCommissionRemittanceAllocation.create.mockResolvedValue({ id: "allocation-1" });
    tx.taxiRideSettlement.update.mockResolvedValue({});
    tx.taxiRideFinancialLedgerEntry.create.mockResolvedValue({});
    tx.taxiRideCommissionPayment.update.mockResolvedValue(successfulPayment);
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    audit.record.mockResolvedValue(undefined);
    notifications.createNotification.mockResolvedValue(undefined);
  });

  it("initializes the full server-authoritative outstanding balance and ignores any client amount concept", async () => {
    const result = await service.initialize("captain-user-1");

    expect(provider.initialize).toHaveBeenCalledWith(expect.objectContaining({
      amount: "12500.00",
      currency: "NGN",
      customerEmail: "captain@example.test",
      customerPhone: "+2348030000000",
      metadata: expect.objectContaining({ purpose: "RIDE_COMMISSION_REMITTANCE", captainUserId: "captain-user-1" })
    }));
    expect(result.authorization.amountKobo).toBe(1_250_000);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
  });

  it("keeps online settlement disabled by default/configuration and creates no intent", async () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => key === "RIDE_CAPTAIN_COMMISSION_PAYMENT_ENABLED" ? false : fallback);

    await expect(service.initialize("captain-user-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiRideCommissionPayment.create).not.toHaveBeenCalled();
  });

  it.each(["customer-user", "partner-user"])("rejects %s without an owned Ride Captain finance profile", async (userId) => {
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(null);

    await expect(service.initialize(userId)).rejects.toThrow("Ride Captain finance profile not found.");
    expect(prisma.taxiDriverProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }));
    expect(prisma.taxiRideCommissionPayment.create).not.toHaveBeenCalled();
  });

  it("cannot verify another Captain's payment reference", async () => {
    prisma.taxiRideCommissionPayment.findFirst.mockResolvedValue(null);

    await expect(service.verifyOwned("different-captain-user", intent.transactionReference)).rejects.toThrow("Captain commission payment not found.");
    expect(prisma.taxiRideCommissionPayment.findFirst).toHaveBeenCalledWith({
      where: { transactionReference: intent.transactionReference, driverProfile: { userId: "different-captain-user" } }
    });
    expect(provider.verify).not.toHaveBeenCalled();
  });

  it("ignores an unsigned or unsuccessful provider callback and posts no financial effect", async () => {
    await expect(service.processWebhook(provider, { eventType: "charge.completed", transactionReference: intent.transactionReference, successful: true, verified: false, amountMinor: intent.amountKobo, currency: "NGN", providerResponse: {} }))
      .resolves.toEqual({ processed: false, reason: "Webhook was not a verified successful commission payment" });
    expect(provider.verify).not.toHaveBeenCalled();
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong amount", { ...successfulEvidence, amountMinor: intent.amountKobo - 100 }],
    ["wrong currency", { ...successfulEvidence, currency: "USD" }]
  ])("rejects provider verification with %s and posts no remittance", async (_label, evidence) => {
    provider.verify.mockResolvedValue(evidence);

    await expect(service.verifyOwned("captain-user-1", intent.transactionReference)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
    expect(prisma.taxiRideCommissionPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideCommissionPaymentStatus.VERIFICATION_FAILED })
    }));
  });

  it.each(["failed", "abandoned"])("does not reduce outstanding for a %s provider payment", async () => {
    provider.verify.mockResolvedValue({ ...successfulEvidence, successful: false });

    await expect(service.verifyOwned("captain-user-1", intent.transactionReference)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
  });

  it("rejects successful verification without a provider transaction identifier", async () => {
    provider.verify.mockResolvedValue({ ...successfulEvidence, providerResponse: { data: {} } });

    await expect(service.verifyOwned("captain-user-1", intent.transactionReference))
      .rejects.toThrow("Provider verification did not return a commission payment transaction identifier.");
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
    expect(prisma.taxiRideCommissionPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideCommissionPaymentStatus.VERIFICATION_FAILED })
    }));
  });

  it("posts one provider-verified remittance only after signed webhook evidence and independent verification", async () => {
    prisma.taxiRideSettlement.findMany.mockResolvedValueOnce([]);
    const result = await service.processWebhook(provider, {
      eventType: "charge.completed",
      transactionReference: intent.transactionReference,
      successful: true,
      verified: true,
      amountMinor: intent.amountKobo,
      currency: "NGN",
      providerResponse: successfulEvidence.providerResponse
    });

    expect(provider.verify).toHaveBeenCalledWith(intent.transactionReference);
    expect(tx.taxiRideCommissionRemittance.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      amountKobo: 1_250_000,
      source: TaxiRideCommissionRemittanceSource.PROVIDER_VERIFIED,
      reference: intent.transactionReference
    }) });
    expect(tx.taxiRideCommissionRemittanceAllocation.create).toHaveBeenCalledTimes(1);
    expect(tx.taxiRideFinancialLedgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.taxiRideCommissionPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideCommissionPaymentStatus.SUCCESSFUL, remittanceId: "remittance-1" })
    }));
    expect(tx.taxiCaptainPayout.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ processed: true, duplicate: false });
  });

  it("treats duplicate webhook/provider-reference uniqueness as harmless and never posts twice", async () => {
    prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "6.19.0",
      meta: { target: ["providerTransactionReference"] }
    }));

    await expect(service.processWebhook(provider, {
      eventType: "charge.completed",
      transactionReference: intent.transactionReference,
      successful: true,
      verified: true,
      amountMinor: intent.amountKobo,
      currency: "NGN",
      providerResponse: successfulEvidence.providerResponse
    })).resolves.toEqual({ processed: false, duplicate: true });
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
  });

  it("does not interrupt or repost an already-successful payment during repeated Captain verification", async () => {
    prisma.taxiRideCommissionPayment.findFirst.mockResolvedValue(successfulPayment);
    prisma.taxiRideSettlement.findMany.mockResolvedValue([]);

    await expect(service.verifyOwned("captain-user-1", intent.transactionReference)).resolves.toMatchObject({
      alreadyProcessed: true,
      eligibility: { outstandingKobo: 0, rideEligible: true }
    });
    expect(provider.verify).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to post a verified amount above the remaining authoritative obligation", async () => {
    tx.taxiRideSettlement.findMany.mockResolvedValue([{ ...settlement, platformReceivableKobo: 1_000_000 }]);

    await expect(service.verifyOwned("captain-user-1", intent.transactionReference)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.taxiRideCommissionPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideCommissionPaymentStatus.REVIEW_REQUIRED })
    }));
    expect(tx.taxiRideCommissionRemittance.create).not.toHaveBeenCalled();
  });

  it("returns only safe provider payment history fields", async () => {
    prisma.taxiRideCommissionPayment.findMany.mockResolvedValue([{ ...successfulPayment, driverProfile: { id: "driver-profile-1", fullName: "Captain Ada" } }]);

    const history = await service.adminHistory();

    expect(history[0]).toMatchObject({
      reference: intent.transactionReference,
      provider: "flutterwave",
      providerReference: "FLW-VERIFIED-209B-H111",
      amountKobo: 1_250_000,
      status: TaxiRideCommissionPaymentStatus.SUCCESSFUL,
      captain: { fullName: "Captain Ada" }
    });
    expect(history[0]).not.toHaveProperty("providerResponse");
    expect(history[0]).not.toHaveProperty("failureReason");
  });
});
