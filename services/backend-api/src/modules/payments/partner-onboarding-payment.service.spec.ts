import { BadRequestException } from "@nestjs/common";
import { PartnerCommercialModel, PartnerOnboardingPaymentStatus, Prisma } from "@prisma/client";
import { PartnerOnboardingPaymentService } from "./partner-onboarding-payment.service";

describe("PartnerOnboardingPaymentService", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const payment = { id: "payment-1", agreementId: "agreement-1", provider: "flutterwave", transactionReference: "KGO-PARTNER-FEE-1", providerTransactionReference: null, amountKobo: 250_000, currency: "NGN", status: PartnerOnboardingPaymentStatus.INITIALIZED, authorizationUrl: "https://checkout.example/partner", providerResponse: null, initializedAt: now, verifiedAt: null, failedAt: null, failureReason: null, expiresAt: new Date("2099-01-01"), createdAt: now, updatedAt: now };
  const agreement = { id: "agreement-1", applicationId: "application-1", applicantUserId: "applicant-1", category: "GROCERIES", commercialModel: PartnerCommercialModel.ONBOARDING_FEE, onboardingFeeKobo: 250_000, currency: "NGN", applicant: { email: "partner@example.test", phoneNumber: "+2348030000000" }, application: { businessName: "Partner Shop" }, onboardingPayments: [], feeWaiver: null };
  const tx: any = { partnerOnboardingPayment: { findUnique: jest.fn(), update: jest.fn() }, paymentWebhookLog: { create: jest.fn() } };
  const prisma: any = { partnerCommercialAgreement: { findFirst: jest.fn() }, partnerOnboardingPayment: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }, paymentWebhookLog: { create: jest.fn() }, $transaction: jest.fn() };
  const provider = { name: "flutterwave" as const, initialize: jest.fn(), verify: jest.fn(), parseWebhook: jest.fn() };
  const providers = { get: jest.fn(() => provider) };
  const config = { get: jest.fn((key: string, fallback: unknown) => key === "PARTNER_ONBOARDING_PAYMENT_ENABLED" ? true : fallback) };
  const audit = { record: jest.fn() };
  const service = new PartnerOnboardingPaymentService(prisma, providers as any, config as any, audit as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) => key === "PARTNER_ONBOARDING_PAYMENT_ENABLED" ? true : fallback);
    prisma.partnerCommercialAgreement.findFirst.mockResolvedValue({ ...agreement, onboardingPayments: [] });
    prisma.partnerOnboardingPayment.findFirst.mockResolvedValue(null);
    prisma.partnerOnboardingPayment.create.mockResolvedValue({ ...payment, status: PartnerOnboardingPaymentStatus.PENDING });
    prisma.partnerOnboardingPayment.update.mockResolvedValue(payment);
    provider.initialize.mockResolvedValue({ transactionReference: payment.transactionReference, authorizationUrl: payment.authorizationUrl, accessCode: null, providerResponse: {} });
    tx.partnerOnboardingPayment.findUnique.mockResolvedValue({ ...payment, agreement });
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    audit.record.mockResolvedValue(undefined);
  });

  it("initializes only the backend-authoritative accepted fee amount", async () => {
    const result = await service.initialize("applicant-1");
    expect(provider.initialize).toHaveBeenCalledWith(expect.objectContaining({ amount: "2500.00", currency: "NGN", metadata: expect.objectContaining({ purpose: "PARTNER_ONBOARDING_FEE", agreementId: "agreement-1" }) }));
    expect(result.payment.amountKobo).toBe(250_000);
  });

  it("recovers an initialized payment after restart instead of charging again", async () => {
    prisma.partnerCommercialAgreement.findFirst.mockResolvedValue({ ...agreement, onboardingPayments: [payment] });
    const result = await service.initialize("applicant-1");
    expect(result.recovered).toBe(true);
    expect(result.payment.reference).toBe(payment.transactionReference);
    expect(prisma.partnerOnboardingPayment.create).not.toHaveBeenCalled();
    expect(provider.initialize).not.toHaveBeenCalled();
  });

  it("blocks payment and activation semantics when the fee is missing rather than charging zero", async () => {
    prisma.partnerCommercialAgreement.findFirst.mockResolvedValue({ ...agreement, onboardingFeeKobo: null, onboardingPayments: [] });
    await expect(service.initialize("applicant-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.initialize).not.toHaveBeenCalled();
  });

  it("does not mark a browser checkout initialization as paid", async () => {
    await service.initialize("applicant-1");
    expect(prisma.partnerOnboardingPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PartnerOnboardingPaymentStatus.INITIALIZED }) }));
    expect(prisma.partnerOnboardingPayment.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PartnerOnboardingPaymentStatus.SUCCESSFUL }) }));
  });

  it("requires exact independently verified reference, amount, currency and provider transaction id", async () => {
    const owned = { ...payment, agreement };
    prisma.partnerOnboardingPayment.findFirst.mockResolvedValue(owned);
    provider.verify.mockResolvedValue({ transactionReference: payment.transactionReference, successful: true, amountMinor: 200_000, currency: "NGN", providerResponse: { data: { flw_ref: "FLW-1" } } });
    await expect(service.verifyOwned("applicant-1", payment.transactionReference)).rejects.toThrow("amount does not match");
  });

  it("treats a duplicate verified webhook as idempotent and never posts a second payment", async () => {
    const evidence = { transactionReference: payment.transactionReference, successful: true, amountMinor: 250_000, currency: "NGN", providerResponse: { data: { flw_ref: "FLW-1" } } };
    provider.verify.mockResolvedValue(evidence);
    prisma.partnerOnboardingPayment.findUnique.mockResolvedValue(payment);
    prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate Partner webhook", { code: "P2002", clientVersion: "6.19.3" }));

    await expect(service.processWebhook(provider as any, {
      eventType: "charge.completed",
      transactionReference: payment.transactionReference,
      successful: true,
      verified: true,
      amountMinor: 250_000,
      currency: "NGN",
      providerResponse: { data: { flw_ref: "FLW-1" } }
    })).resolves.toEqual({ processed: false, duplicate: true });
    expect(provider.verify).toHaveBeenCalledWith(payment.transactionReference);
  });

  it("treats an already successful verified payment idempotently", async () => {
    prisma.partnerOnboardingPayment.findFirst.mockResolvedValue({ ...payment, status: PartnerOnboardingPaymentStatus.SUCCESSFUL, providerTransactionReference: "FLW-1", verifiedAt: now, agreement });
    const result = await service.verifyOwned("applicant-1", payment.transactionReference);
    expect(result.alreadyProcessed).toBe(true);
    expect(provider.verify).not.toHaveBeenCalled();
  });
});
