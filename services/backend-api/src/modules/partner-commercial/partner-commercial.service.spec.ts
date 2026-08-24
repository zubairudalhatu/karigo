import { BadRequestException } from "@nestjs/common";
import { PartnerCommercialModel, PartnerOnboardingPaymentStatus, VendorApplicationCategory, VendorApplicationStatus } from "@prisma/client";
import { PartnerCommercialService } from "./partner-commercial.service";
import { PARTNER_TERMS_VERSION } from "./partner-commercial-policy";

describe("PartnerCommercialService", () => {
  const now = new Date("2026-08-24T10:00:00.000Z");
  const restaurant = {
    id: "11111111-1111-4111-8111-111111111111", businessCategory: VendorApplicationCategory.RESTAURANT,
    commercialModel: PartnerCommercialModel.COMMISSION, commissionRateBasisPoints: 1000, onboardingFeeKobo: null,
    renewalFeeKobo: null, currency: "NGN", effectiveFrom: now, effectiveTo: null, isActive: true,
    publicOnboardingEnabled: true, publicTitle: "KariGO Restaurant Partner", publicSummary: "10% merchandise subtotal; delivery fee excluded.",
    policyVersion: "launch-v1", internalNote: "private", createdByAdminId: null, updatedByAdminId: null, createdAt: now, updatedAt: now
  };
  const grocery = { ...restaurant, id: "22222222-2222-4222-8222-222222222222", businessCategory: VendorApplicationCategory.GROCERIES, commercialModel: PartnerCommercialModel.ONBOARDING_FEE, commissionRateBasisPoints: 0, publicTitle: "KariGO Grocery Partner" };
  const prisma: any = {
    partnerCommercialPolicy: { findMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    partnerCommercialAgreement: { findFirst: jest.fn(), findUnique: jest.fn() },
    partnerOnboardingFeeWaiver: { create: jest.fn() }, vendor: { findUnique: jest.fn() },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn((key: string, fallback: unknown) => key === "PARTNER_PUBLIC_ONBOARDING_ENABLED" ? true : fallback) };
  const service = new PartnerCommercialService(prisma, audit as any, config as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) => key === "PARTNER_PUBLIC_ONBOARDING_ENABLED" ? true : fallback);
  });

  it("returns safe policy fields and never exposes internal notes or Admin identifiers", async () => {
    prisma.partnerCommercialPolicy.findMany.mockResolvedValue([restaurant]);
    const [policy] = await service.publicPolicies();
    expect(policy).toMatchObject({ commissionPercent: 10, onboardingFeeConfigured: false, visibleInPublicCategorySelection: true });
    expect(policy).not.toHaveProperty("internalNote");
    expect(policy).not.toHaveProperty("createdByAdminId");
  });

  it("does not interpret an unconfigured onboarding fee as zero", async () => {
    prisma.partnerCommercialPolicy.findFirst.mockResolvedValue(grocery);
    await expect(service.prepareAgreement("applicant-1", { businessCategory: VendorApplicationCategory.GROCERIES, commercialPolicyId: grocery.id, commercialTermsAccepted: true, acceptedTermsVersion: PARTNER_TERMS_VERSION })).rejects.toThrow("finalising the onboarding fee");
  });

  it("accepts an explicit zero policy but preserves it distinctly from missing configuration", async () => {
    prisma.partnerCommercialPolicy.findFirst.mockResolvedValue({ ...grocery, onboardingFeeKobo: 0 });
    const agreement = await service.prepareAgreement("applicant-1", { businessCategory: VendorApplicationCategory.GROCERIES, commercialPolicyId: grocery.id, commercialTermsAccepted: true, acceptedTermsVersion: PARTNER_TERMS_VERSION });
    expect(agreement.onboardingFeeKobo).toBe(0);
  });

  it("creates an immutable policy snapshot that is unaffected by later policy edits", async () => {
    const source = { ...restaurant };
    prisma.partnerCommercialPolicy.findFirst.mockResolvedValue(source);
    const agreement = await service.prepareAgreement("applicant-1", { businessCategory: VendorApplicationCategory.RESTAURANT, commercialPolicyId: source.id, commercialTermsAccepted: true, acceptedTermsVersion: PARTNER_TERMS_VERSION });
    source.commissionRateBasisPoints = 0;
    source.publicSummary = "later policy";
    expect(agreement.commissionRateBasisPoints).toBe(1000);
    expect(agreement.policySnapshot).toMatchObject({ commissionRateBasisPoints: 1000, publicSummary: "10% merchandise subtotal; delivery fee excluded." });
  });

  it("blocks activation while fee is unpaid and permits it only after provider verification", async () => {
    const agreement = { ...grocery, onboardingFeeKobo: 250_000, application: { status: VendorApplicationStatus.APPROVED }, onboardingPayments: [], feeWaiver: null };
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-1", commercialAgreement: agreement });
    await expect(service.assertVendorActivationReady("vendor-1")).rejects.toBeInstanceOf(BadRequestException);
    agreement.onboardingPayments.push({ status: PartnerOnboardingPaymentStatus.SUCCESSFUL } as never);
    await expect(service.assertVendorActivationReady("vendor-1")).resolves.toBe(agreement);
  });

  it("does not let a verified fee bypass application approval", async () => {
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-1", commercialAgreement: { ...grocery, application: { status: VendorApplicationStatus.UNDER_REVIEW }, onboardingPayments: [{ status: PartnerOnboardingPaymentStatus.SUCCESSFUL }], feeWaiver: null } });
    await expect(service.assertVendorActivationReady("vendor-1")).rejects.toThrow("application approval");
  });

  it("permits the financial gate through an explicit authorized waiver without bypassing approval", async () => {
    const agreement = { ...grocery, onboardingFeeKobo: 250_000, application: { status: VendorApplicationStatus.APPROVED }, onboardingPayments: [], feeWaiver: { id: "waiver-1" } };
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-1", commercialAgreement: agreement });
    await expect(service.assertVendorActivationReady("vendor-1")).resolves.toBe(agreement);
  });

  it("records authorized fee waivers with the snapshotted amount and audit actor", async () => {
    prisma.partnerCommercialAgreement.findUnique.mockResolvedValue({ ...grocery, onboardingFeeKobo: 250_000, feeWaiver: null });
    const waiver = { id: "waiver-1", agreementId: "agreement-1", amountWaivedKobo: 250_000, currency: "NGN", reason: "Approved launch waiver" };
    prisma.partnerOnboardingFeeWaiver.create.mockResolvedValue(waiver);
    audit.record.mockResolvedValue(undefined);

    await expect(service.waiveFee("finance-admin", "FINANCE_OFFICER", "agreement-1", { reason: "Approved launch waiver", note: "Governed exception for pilot Partner" })).resolves.toBe(waiver);
    expect(prisma.partnerOnboardingFeeWaiver.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountWaivedKobo: 250_000, waivedByAdminId: "finance-admin", reason: "Approved launch waiver" }) });
    expect(audit.record).toHaveBeenCalledWith("finance-admin", "admin.partner_onboarding_fee.waived", "PartnerOnboardingFeeWaiver", "waiver-1", expect.any(Object));
  });

  it("restricts fee waivers to Super Admin and Finance", async () => {
    await expect(service.waiveFee("admin-1", "VENDOR_MANAGER", "agreement-1", { reason: "Approved launch waiver", note: "Governed exception" })).rejects.toThrow("Only Super Admin or Finance");
    expect(prisma.partnerOnboardingFeeWaiver.create).not.toHaveBeenCalled();
  });
});
