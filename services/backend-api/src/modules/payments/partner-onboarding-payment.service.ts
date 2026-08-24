import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PartnerCommercialModel, PartnerOnboardingPaymentStatus, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { PaymentProvider, VerifyPaymentResult, WebhookPaymentResult } from "./providers/payment-provider.interface";

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PartnerOnboardingPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: ConfigService,
    private readonly audit: AdminAuditService
  ) {}

  async exists(transactionReference: string) {
    return Boolean(await this.prisma.partnerOnboardingPayment.findUnique({ where: { transactionReference }, select: { id: true } }));
  }

  async initialize(userId: string) {
    this.assertEnabled();
    const agreement = await this.prisma.partnerCommercialAgreement.findFirst({
      where: { applicantUserId: userId },
      include: {
        applicant: { select: { email: true, phoneNumber: true } },
        onboardingPayments: { where: { status: { in: [PartnerOnboardingPaymentStatus.PENDING, PartnerOnboardingPaymentStatus.INITIALIZED] } }, orderBy: { createdAt: "desc" }, take: 1 },
        feeWaiver: true
      },
      orderBy: { acceptedAt: "desc" }
    });
    if (!agreement) throw new NotFoundException("Accepted Partner commercial agreement not found.");
    if (agreement.commercialModel !== PartnerCommercialModel.ONBOARDING_FEE) throw new BadRequestException("This Partner category does not require an onboarding fee payment.");
    if (agreement.onboardingFeeKobo === null) throw new BadRequestException("KariGO is finalising the onboarding fee for this Partner category. No payment can be created yet.");
    if (agreement.onboardingFeeKobo === 0 || agreement.feeWaiver) throw new BadRequestException("This Partner onboarding fee has been explicitly waived.");
    const paid = await this.prisma.partnerOnboardingPayment.findFirst({ where: { agreementId: agreement.id, status: PartnerOnboardingPaymentStatus.SUCCESSFUL } });
    if (paid) return { payment: this.safePayment(paid), alreadyProcessed: true, receipt: this.receipt(paid, agreement) };
    const recoverable = agreement.onboardingPayments[0];
    if (recoverable && (!recoverable.expiresAt || recoverable.expiresAt > new Date())) {
      return { payment: this.safePayment(recoverable), recovered: true, authorization: this.authorization(recoverable) };
    }
    const provider = this.providers.get("flutterwave");
    const transactionReference = `KGO-PARTNER-FEE-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const intent = await this.prisma.partnerOnboardingPayment.create({
      data: { agreementId: agreement.id, provider: provider.name, transactionReference, amountKobo: agreement.onboardingFeeKobo, currency: "NGN", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    });
    try {
      const initialized = await provider.initialize({
        transactionReference,
        amount: (intent.amountKobo / 100).toFixed(2),
        currency: intent.currency,
        customerEmail: agreement.applicant.email,
        customerPhone: agreement.applicant.phoneNumber,
        metadata: { purpose: "PARTNER_ONBOARDING_FEE", agreementId: agreement.id, applicationId: agreement.applicationId, applicantUserId: userId }
      });
      const payment = await this.prisma.partnerOnboardingPayment.update({
        where: { id: intent.id },
        data: { status: PartnerOnboardingPaymentStatus.INITIALIZED, initializedAt: new Date(), authorizationUrl: initialized.authorizationUrl }
      });
      return { payment: this.safePayment(payment), recovered: false, authorization: this.authorization(payment) };
    } catch (error) {
      await this.prisma.partnerOnboardingPayment.update({ where: { id: intent.id }, data: { status: PartnerOnboardingPaymentStatus.FAILED, failedAt: new Date(), failureReason: "Provider checkout could not be initialized" } });
      throw error;
    }
  }

  async verifyOwned(userId: string, transactionReference: string) {
    const intent = await this.prisma.partnerOnboardingPayment.findFirst({ where: { transactionReference, agreement: { applicantUserId: userId } }, include: { agreement: { include: { application: { select: { businessName: true } } } } } });
    if (!intent) throw new NotFoundException("Partner onboarding payment not found.");
    if (intent.status === PartnerOnboardingPaymentStatus.SUCCESSFUL) return { payment: this.safePayment(intent), alreadyProcessed: true, receipt: this.receipt(intent, intent.agreement) };
    const provider = this.providers.get(intent.provider);
    const evidence = await provider.verify(intent.transactionReference);
    if (!evidence.successful) {
      await this.markFailure(intent.id, "Provider did not confirm a successful Partner onboarding payment");
      throw new BadRequestException("Partner onboarding payment is still awaiting provider verification.");
    }
    const result = await this.processVerified(intent.transactionReference, provider.name, evidence);
    return { payment: this.safePayment(result.payment), alreadyProcessed: result.duplicate, receipt: this.receipt(result.payment, intent.agreement) };
  }

  async processWebhook(provider: PaymentProvider, webhook: WebhookPaymentResult) {
    if (!webhook.transactionReference) throw new BadRequestException("Partner onboarding payment webhook is missing its reference.");
    const transactionReference = webhook.transactionReference;
    if (!webhook.verified || !webhook.successful) return { processed: false, reason: "Webhook was not a verified successful Partner onboarding payment" };
    const independentlyVerified = await provider.verify(transactionReference);
    if (!independentlyVerified.successful) throw new BadRequestException("Provider verification did not confirm the Partner onboarding payment.");
    const intent = await this.requireIntent(transactionReference);
    this.assertEvidence(intent, { ...webhook, transactionReference });
    this.assertEvidence(intent, independentlyVerified);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookLog.create({ data: { gateway: provider.name, eventType: webhook.eventType, transactionReference, payload: webhook.providerResponse as Prisma.InputJsonValue, isVerified: true, processedAt: new Date() } });
        return this.processVerifiedWithClient(tx, transactionReference, provider.name, independentlyVerified);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.auditPosted(result);
      return { processed: true, payment: this.safePayment(result.payment), duplicate: result.duplicate };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { processed: false, duplicate: true };
      throw error;
    }
  }

  private async processVerified(transactionReference: string, provider: string, evidence: VerifyPaymentResult) {
    const result = await this.prisma.$transaction((tx) => this.processVerifiedWithClient(tx, transactionReference, provider, evidence), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.auditPosted(result);
    return result;
  }

  private async processVerifiedWithClient(tx: TransactionClient, transactionReference: string, provider: string, evidence: VerifyPaymentResult) {
    const intent = await tx.partnerOnboardingPayment.findUnique({ where: { transactionReference }, include: { agreement: true } });
    if (!intent) throw new NotFoundException("Partner onboarding payment not found.");
    if (intent.provider !== provider) throw new BadRequestException("Partner onboarding payment provider does not match the intent.");
    if (intent.status === PartnerOnboardingPaymentStatus.SUCCESSFUL) return { payment: intent, duplicate: true, applicantUserId: null as string | null };
    this.assertEvidence(intent, evidence);
    if (intent.agreement.onboardingFeeKobo === null || intent.amountKobo !== intent.agreement.onboardingFeeKobo) {
      await tx.partnerOnboardingPayment.update({ where: { id: intent.id }, data: { status: PartnerOnboardingPaymentStatus.REVIEW_REQUIRED, failureReason: "Verified amount no longer matches the accepted agreement snapshot" } });
      throw new ConflictException("Verified Partner onboarding payment requires Finance review.");
    }
    const providerReference = this.providerReference(evidence.providerResponse);
    if (!providerReference) throw new BadRequestException("Provider verification did not return a transaction identifier.");
    const payment = await tx.partnerOnboardingPayment.update({
      where: { id: intent.id },
      data: { status: PartnerOnboardingPaymentStatus.SUCCESSFUL, providerTransactionReference: providerReference, providerResponse: evidence.providerResponse as Prisma.InputJsonValue, verifiedAt: new Date(), failedAt: null, failureReason: null }
    });
    return { payment, duplicate: false, applicantUserId: intent.agreement.applicantUserId };
  }

  private async auditPosted(result: { payment: { id: string; transactionReference: string; amountKobo: number }; duplicate: boolean; applicantUserId: string | null }) {
    if (result.duplicate || !result.applicantUserId) return;
    await this.audit.record(result.applicantUserId, "partner.onboarding_fee.provider_verified", "PartnerOnboardingPayment", result.payment.id, { reference: result.payment.transactionReference, amountKobo: result.payment.amountKobo, purpose: "PARTNER_ONBOARDING_FEE" });
  }

  private assertEvidence(intent: { transactionReference: string; amountKobo: number; currency: string }, evidence: { transactionReference: string; amountMinor?: number; currency?: string }) {
    if (evidence.transactionReference !== intent.transactionReference) throw new BadRequestException("Provider reference does not match the Partner onboarding payment.");
    if (!evidence.currency || evidence.currency.toUpperCase() !== intent.currency.toUpperCase()) throw new BadRequestException("Provider currency does not match the accepted NGN fee.");
    if (evidence.amountMinor === undefined || evidence.amountMinor !== intent.amountKobo) throw new BadRequestException("Provider amount does not match the authoritative accepted onboarding fee.");
  }

  private async requireIntent(transactionReference: string) {
    const intent = await this.prisma.partnerOnboardingPayment.findUnique({ where: { transactionReference } });
    if (!intent) throw new NotFoundException("Partner onboarding payment not found.");
    return intent;
  }

  private providerReference(response: Record<string, unknown>) {
    const data = response.data && typeof response.data === "object" && !Array.isArray(response.data) ? response.data as Record<string, unknown> : {};
    const value = data.flw_ref ?? data.id ?? data.transaction_id ?? response.flw_ref ?? response.id;
    return value === undefined || value === null ? null : String(value).slice(0, 160);
  }

  private async markFailure(id: string, reason: string) {
    await this.prisma.partnerOnboardingPayment.update({ where: { id }, data: { status: PartnerOnboardingPaymentStatus.VERIFICATION_FAILED, failedAt: new Date(), failureReason: reason.slice(0, 300) } });
  }

  private safePayment(item: any) {
    return { id: item.id, reference: item.transactionReference, provider: item.provider, providerReference: item.providerTransactionReference, amountKobo: item.amountKobo, currency: item.currency, status: item.status, checkoutUrl: item.authorizationUrl, initializedAt: item.initializedAt?.toISOString() ?? null, verifiedAt: item.verifiedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() };
  }

  private authorization(item: any) {
    return { reference: item.transactionReference, amountKobo: item.amountKobo, amount: item.amountKobo / 100, currency: item.currency, provider: item.provider, authorizationUrl: item.authorizationUrl, checkoutUrl: item.authorizationUrl };
  }

  private receipt(payment: any, agreement: any) {
    return { reference: payment.transactionReference, businessName: agreement.application?.businessName ?? null, category: agreement.category, amountKobo: payment.amountKobo, currency: payment.currency, provider: payment.provider, verifiedAt: payment.verifiedAt?.toISOString() ?? null, purpose: "KariGO onboarding/platform fee" };
  }

  private assertEnabled() {
    const enabled = this.config.get<boolean | string>("PARTNER_ONBOARDING_PAYMENT_ENABLED", false);
    if (!(enabled === true || String(enabled).toLowerCase() === "true")) throw new BadRequestException("Online Partner onboarding fee payment is temporarily unavailable.");
  }
}
