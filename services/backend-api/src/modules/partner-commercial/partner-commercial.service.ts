import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PartnerCommercialModel,
  PartnerOnboardingPaymentStatus,
  Prisma,
  VendorApplicationCategory
} from "@prisma/client";
import { createHash } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PartnerFeeWaiverDto, UpdatePartnerCommercialPolicyDto } from "./dto/update-partner-commercial-policy.dto";
import { assertCategoryCommercialRule, ONBOARDING_FEE_CATEGORIES, PARTNER_TERMS_VERSION } from "./partner-commercial-policy";

type TransactionClient = Prisma.TransactionClient;
type PolicyRecord = Prisma.PartnerCommercialPolicyGetPayload<Record<string, never>>;

@Injectable()
export class PartnerCommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly config: ConfigService
  ) {}

  async publicPolicies() {
    const policies = await this.prisma.partnerCommercialPolicy.findMany({
      where: { isActive: true, effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
      orderBy: [{ businessCategory: "asc" }, { effectiveFrom: "desc" }]
    });
    const latest = new Map<VendorApplicationCategory, PolicyRecord>();
    for (const policy of policies) if (!latest.has(policy.businessCategory)) latest.set(policy.businessCategory, policy);
    return [...latest.values()].map((policy) => this.publicPolicy(policy));
  }

  async adminPolicies() {
    const items = await this.prisma.partnerCommercialPolicy.findMany({ orderBy: [{ businessCategory: "asc" }, { effectiveFrom: "desc" }] });
    return items.map((item) => ({ ...this.publicPolicy(item), isActive: item.isActive, internalNote: item.internalNote, createdByAdminId: item.createdByAdminId, updatedByAdminId: item.updatedByAdminId, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }));
  }

  async updatePolicy(adminUserId: string, dto: UpdatePartnerCommercialPolicyDto) {
    try {
      assertCategoryCommercialRule(dto);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid Partner commercial policy.");
    }
    if (dto.onboardingFeeKobo !== undefined && dto.onboardingFeeKobo !== null && !ONBOARDING_FEE_CATEGORIES.has(dto.businessCategory)) {
      throw new BadRequestException("Onboarding fee can only be configured for an onboarding-fee Partner category.");
    }
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveTo && effectiveTo <= effectiveFrom) throw new BadRequestException("Policy effectiveTo must be after effectiveFrom.");
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.isActive) {
          await tx.partnerCommercialPolicy.updateMany({
            where: { businessCategory: dto.businessCategory, isActive: true },
            data: { isActive: false, effectiveTo: effectiveFrom, updatedByAdminId: adminUserId }
          });
        }
        return tx.partnerCommercialPolicy.create({
          data: {
            ...dto,
            onboardingFeeKobo: dto.onboardingFeeKobo ?? null,
            renewalFeeKobo: dto.renewalFeeKobo ?? null,
            currency: "NGN",
            effectiveFrom,
            effectiveTo,
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId
          }
        });
      });
      await this.audit.record(adminUserId, "admin.partner_commercial_policy.version_created", "PartnerCommercialPolicy", created.id, {
        businessCategory: created.businessCategory,
        commercialModel: created.commercialModel,
        policyVersion: created.policyVersion,
        commissionRateBasisPoints: created.commissionRateBasisPoints,
        onboardingFeeConfigured: created.onboardingFeeKobo !== null
      });
      return this.publicPolicy(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("This category and policy version already exists.");
      throw error;
    }
  }

  async prepareAgreement(applicantUserId: string, input: {
    businessCategory: VendorApplicationCategory;
    commercialPolicyId?: string;
    commercialTermsAccepted?: boolean;
    acceptedTermsVersion?: string;
    acceptedFromAppSurface?: string;
  }): Promise<Prisma.PartnerCommercialAgreementCreateWithoutApplicationInput> {
    if (!this.publicOnboardingEnabled()) throw new BadRequestException("KariGO Partner public onboarding is not currently enabled.");
    if (input.businessCategory === VendorApplicationCategory.PARCEL_LOGISTICS_PARTNER) throw new BadRequestException("Third-party parcel Partner onboarding is not publicly available.");
    if (!input.commercialTermsAccepted) throw new BadRequestException("Explicit acceptance of the KariGO Partner commercial terms is required.");
    if (!input.commercialPolicyId) throw new BadRequestException("Select the current KariGO Partner commercial policy before submitting.");
    if (input.acceptedTermsVersion !== PARTNER_TERMS_VERSION) throw new BadRequestException("Review and accept the current KariGO Partner commercial terms version.");
    const policy = await this.requireActivePolicy(input.businessCategory, input.commercialPolicyId);
    if (!policy.publicOnboardingEnabled) throw new BadRequestException("Public onboarding is not enabled for this Partner category.");
    if (policy.commercialModel === PartnerCommercialModel.ONBOARDING_FEE && policy.onboardingFeeKobo === null) {
      throw new BadRequestException("KariGO is finalising the onboarding fee for this Partner category. You may save your application and continue when the commercial terms are available.");
    }
    const snapshot = this.snapshot(policy);
    return {
      applicant: { connect: { id: applicantUserId } },
      policy: { connect: { id: policy.id } },
      category: policy.businessCategory,
      policyVersion: policy.policyVersion,
      commercialModel: policy.commercialModel,
      commissionRateBasisPoints: policy.commissionRateBasisPoints,
      onboardingFeeKobo: policy.onboardingFeeKobo,
      renewalFeeKobo: policy.renewalFeeKobo,
      currency: policy.currency,
      publicTitleSnapshot: policy.publicTitle,
      publicSummarySnapshot: policy.publicSummary,
      policySnapshot: snapshot as Prisma.InputJsonValue,
      policyHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      acceptedTermsVersion: PARTNER_TERMS_VERSION,
      acceptedFromAppSurface: (input.acceptedFromAppSurface || "partner-mobile-app").slice(0, 80)
    };
  }

  async ownCommercialState(userId: string) {
    const agreement = await this.prisma.partnerCommercialAgreement.findFirst({
      where: { applicantUserId: userId },
      include: {
        application: { select: { id: true, reference: true, status: true, businessName: true } },
        onboardingPayments: { orderBy: { createdAt: "desc" }, take: 5 },
        feeWaiver: true,
        vendor: { select: { id: true, status: true, businessName: true } }
      },
      orderBy: { acceptedAt: "desc" }
    });
    if (!agreement) return { agreement: null, feeState: null, activationEligible: false, blockers: ["COMMERCIAL_AGREEMENT_REQUIRED"] };
    return this.commercialState(agreement);
  }

  async applicationCommercialState(applicationId: string) {
    const agreement = await this.prisma.partnerCommercialAgreement.findUnique({
      where: { applicationId }, include: { onboardingPayments: { orderBy: { createdAt: "desc" } }, feeWaiver: true, vendor: { select: { id: true, status: true, businessName: true } }, application: { select: { id: true, reference: true, status: true, businessName: true } } }
    });
    return agreement ? this.commercialState(agreement) : { agreement: null, feeState: null, activationEligible: false, blockers: ["COMMERCIAL_AGREEMENT_REQUIRED"] };
  }

  async assertVendorActivationReady(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { commercialAgreement: { include: { onboardingPayments: true, feeWaiver: true, application: { select: { status: true } } } } }
    });
    if (!vendor) throw new NotFoundException("Partner not found.");
    const agreement = vendor.commercialAgreement;
    if (!agreement) throw new BadRequestException("An accepted Partner commercial agreement is required before activation.");
    if (agreement.application.status !== "APPROVED") throw new BadRequestException("Partner application approval is required before commercial activation.");
    const blockers = this.activationBlockers(agreement);
    if (blockers.length) throw new BadRequestException(this.blockerMessage(blockers[0]));
    return agreement;
  }

  async waiveFee(adminUserId: string, adminRole: string | null | undefined, agreementId: string, dto: PartnerFeeWaiverDto) {
    if (!['SUPER_ADMIN', 'FINANCE_OFFICER'].includes(adminRole ?? "")) throw new BadRequestException("Only Super Admin or Finance may waive a Partner onboarding fee.");
    if (!dto.reason.trim() || !dto.note.trim()) throw new BadRequestException("Fee waiver reason and governance note are required.");
    const agreement = await this.prisma.partnerCommercialAgreement.findUnique({ where: { id: agreementId }, include: { feeWaiver: true } });
    if (!agreement) throw new NotFoundException("Partner commercial agreement not found.");
    if (agreement.commercialModel !== PartnerCommercialModel.ONBOARDING_FEE || agreement.onboardingFeeKobo === null) throw new BadRequestException("This agreement has no configured onboarding fee to waive.");
    if (agreement.feeWaiver) return agreement.feeWaiver;
    const waiver = await this.prisma.partnerOnboardingFeeWaiver.create({ data: { agreementId, amountWaivedKobo: agreement.onboardingFeeKobo, currency: agreement.currency, reason: dto.reason.trim(), note: dto.note.trim(), waivedByAdminId: adminUserId } });
    await this.audit.record(adminUserId, "admin.partner_onboarding_fee.waived", "PartnerOnboardingFeeWaiver", waiver.id, { agreementId, amountWaivedKobo: waiver.amountWaivedKobo, reason: waiver.reason });
    return waiver;
  }

  private async requireActivePolicy(category: VendorApplicationCategory, id: string) {
    const now = new Date();
    const policy = await this.prisma.partnerCommercialPolicy.findFirst({ where: { id, businessCategory: category, isActive: true, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] } });
    if (!policy) throw new BadRequestException("The selected Partner commercial policy is no longer active. Review the current terms.");
    assertCategoryCommercialRule(policy);
    return policy;
  }

  private publicPolicy(policy: PolicyRecord) {
    const globallyEnabled = this.publicOnboardingEnabled();
    return {
      id: policy.id,
      businessCategory: policy.businessCategory,
      commercialModel: policy.commercialModel,
      commissionRateBasisPoints: policy.commissionRateBasisPoints,
      commissionPercent: policy.commissionRateBasisPoints / 100,
      onboardingFeeKobo: policy.onboardingFeeKobo,
      onboardingFeeConfigured: policy.onboardingFeeKobo !== null,
      renewalFeeKobo: policy.renewalFeeKobo,
      currency: policy.currency,
      publicTitle: policy.publicTitle,
      publicSummary: policy.publicSummary,
      policyVersion: policy.policyVersion,
      termsVersion: PARTNER_TERMS_VERSION,
      effectiveFrom: policy.effectiveFrom.toISOString(),
      effectiveTo: policy.effectiveTo?.toISOString() ?? null,
      categoryPublicOnboardingEnabled: policy.publicOnboardingEnabled,
      publicOnboardingEnabled: globallyEnabled && policy.publicOnboardingEnabled,
      visibleInPublicCategorySelection: policy.businessCategory !== VendorApplicationCategory.PARCEL_LOGISTICS_PARTNER
    };
  }

  private snapshot(policy: PolicyRecord) {
    return { businessCategory: policy.businessCategory, commercialModel: policy.commercialModel, commissionRateBasisPoints: policy.commissionRateBasisPoints, onboardingFeeKobo: policy.onboardingFeeKobo, renewalFeeKobo: policy.renewalFeeKobo, currency: policy.currency, publicTitle: policy.publicTitle, publicSummary: policy.publicSummary, policyVersion: policy.policyVersion, effectiveFrom: policy.effectiveFrom.toISOString(), effectiveTo: policy.effectiveTo?.toISOString() ?? null };
  }

  private commercialState(agreement: any) {
    const blockers = this.activationBlockers(agreement);
    if (agreement.application?.status !== "APPROVED") blockers.unshift("APPLICATION_APPROVAL_REQUIRED");
    if (!agreement.vendor) blockers.push("PARTNER_PROFILE_PENDING");
    const feeState = agreement.commercialModel !== PartnerCommercialModel.ONBOARDING_FEE ? "NOT_APPLICABLE"
      : agreement.onboardingFeeKobo === null ? "FEE_NOT_CONFIGURED"
        : agreement.onboardingFeeKobo === 0 || agreement.feeWaiver ? "WAIVED"
          : agreement.onboardingPayments.some((payment: any) => payment.status === PartnerOnboardingPaymentStatus.SUCCESSFUL) ? "PAID" : "PENDING";
    return {
      agreement: {
        id: agreement.id, category: agreement.category, policyId: agreement.policyId, policyVersion: agreement.policyVersion,
        commercialModel: agreement.commercialModel, commissionRateBasisPoints: agreement.commissionRateBasisPoints,
        commissionPercent: agreement.commissionRateBasisPoints / 100, onboardingFeeKobo: agreement.onboardingFeeKobo,
        renewalFeeKobo: agreement.renewalFeeKobo, currency: agreement.currency, publicTitle: agreement.publicTitleSnapshot,
        publicSummary: agreement.publicSummarySnapshot, acceptedAt: agreement.acceptedAt.toISOString(), acceptedTermsVersion: agreement.acceptedTermsVersion,
        application: agreement.application, vendor: agreement.vendor ?? null
      },
      feeState,
      feeWaiver: agreement.feeWaiver ? { amountWaivedKobo: agreement.feeWaiver.amountWaivedKobo, waivedAt: agreement.feeWaiver.waivedAt.toISOString(), reason: agreement.feeWaiver.reason } : null,
      payments: agreement.onboardingPayments.map((payment: any) => ({ id: payment.id, reference: payment.transactionReference, provider: payment.provider, amountKobo: payment.amountKobo, currency: payment.currency, status: payment.status, checkoutUrl: payment.authorizationUrl, initiatedAt: payment.createdAt.toISOString(), verifiedAt: payment.verifiedAt?.toISOString() ?? null })),
      activationEligible: blockers.length === 0,
      blockers
    };
  }

  private activationBlockers(agreement: any): string[] {
    if (agreement.commercialModel === PartnerCommercialModel.QUOTATION) return ["THIRD_PARTY_PARCEL_DISABLED"];
    if (agreement.commercialModel === PartnerCommercialModel.REVIEW_REQUIRED) return ["COMMERCIAL_CLASSIFICATION_REQUIRED"];
    if (agreement.commercialModel !== PartnerCommercialModel.ONBOARDING_FEE) return [];
    if (agreement.onboardingFeeKobo === null) return ["FEE_NOT_CONFIGURED"];
    if (agreement.onboardingFeeKobo === 0 || agreement.feeWaiver) return [];
    if (agreement.onboardingPayments.some((payment: any) => payment.status === PartnerOnboardingPaymentStatus.SUCCESSFUL)) return [];
    return ["ONBOARDING_FEE_UNPAID"];
  }

  private blockerMessage(blocker: string) {
    if (blocker === "FEE_NOT_CONFIGURED") return "KariGO is finalising the onboarding fee for this Partner category. Activation remains blocked.";
    if (blocker === "APPLICATION_APPROVAL_REQUIRED") return "Partner application approval is required before commercial activation.";
    if (blocker === "ONBOARDING_FEE_UNPAID") return "The provider-verified KariGO onboarding/platform fee or an authorized waiver is required before activation.";
    if (blocker === "THIRD_PARTY_PARCEL_DISABLED") return "Third-party parcel Partner activation is not enabled for launch.";
    return "KariGO must classify and approve the Partner commercial terms before activation.";
  }

  private publicOnboardingEnabled() {
    const value = this.config.get<boolean | string>("PARTNER_PUBLIC_ONBOARDING_ENABLED", false);
    return value === true || String(value).toLowerCase() === "true";
  }
}
