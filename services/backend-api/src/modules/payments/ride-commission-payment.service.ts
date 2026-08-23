import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationType,
  Prisma,
  TaxiRideCommissionPaymentStatus,
  TaxiRideCommissionRemittanceSource,
  TaxiRideFinancialOutcome,
  TaxiRideLedgerDirection,
  TaxiRideLedgerEntryType,
  TaxiRideSettlementDirection,
  TaxiRideSettlementStatus,
  TaxiTripActorType
} from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  captainCommissionOutstandingKobo,
  DEFAULT_RIDE_COMMISSION_BLOCK_THRESHOLD_KOBO,
  DEFAULT_RIDE_COMMISSION_URGENT_THRESHOLD_KOBO,
  DEFAULT_RIDE_COMMISSION_WARNING_THRESHOLD_KOBO,
  evaluateRideCommissionEligibility
} from "../taxi/ride-commission-policy";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import type { PaymentProvider, VerifyPaymentResult, WebhookPaymentResult } from "./providers/payment-provider.interface";

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class RideCommissionPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: ConfigService,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService
  ) {}

  async exists(transactionReference: string) {
    return Boolean(await this.prisma.taxiRideCommissionPayment.findUnique({ where: { transactionReference }, select: { id: true } }));
  }

  async initialize(userId: string) {
    this.assertEnabled();
    const profile = await this.prisma.taxiDriverProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true, phoneNumber: true } } }
    });
    if (!profile?.user) throw new NotFoundException("Ride Captain finance profile not found.");
    const outstandingKobo = await this.outstandingForProfile(profile.id);
    if (outstandingKobo <= 0) throw new BadRequestException("There is no outstanding KariGO service fee to settle.");
    const providerName = this.config.get<string>("RIDE_CAPTAIN_COMMISSION_PAYMENT_PROVIDER", "flutterwave").toLowerCase();
    if (providerName !== "flutterwave") throw new BadRequestException("Captain commission payment provider is unavailable.");
    const provider = this.providers.get(providerName);
    const transactionReference = `KGO-RIDE-FEE-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const intent = await this.prisma.taxiRideCommissionPayment.create({
      data: {
        driverProfileId: profile.id,
        provider: provider.name,
        transactionReference,
        amountKobo: outstandingKobo,
        currency: "NGN",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    try {
      const authorization = await provider.initialize({
        transactionReference,
        amount: (outstandingKobo / 100).toFixed(2),
        currency: "NGN",
        customerEmail: profile.user.email,
        customerPhone: profile.user.phoneNumber,
        metadata: {
          purpose: "RIDE_COMMISSION_REMITTANCE",
          commissionPaymentId: intent.id,
          captainUserId: userId,
          driverProfileId: profile.id
        }
      });
      const updated = await this.prisma.taxiRideCommissionPayment.update({
        where: { id: intent.id }, data: { status: TaxiRideCommissionPaymentStatus.INITIALIZED, initializedAt: new Date() }
      });
      return {
        payment: this.safePayment(updated),
        authorization: {
          transactionReference,
          reference: transactionReference,
          amountKobo: outstandingKobo,
          amount: outstandingKobo / 100,
          currency: "NGN",
          provider: provider.name,
          authorizationUrl: authorization.authorizationUrl,
          checkoutUrl: authorization.authorizationUrl
        }
      };
    } catch (error) {
      await this.prisma.taxiRideCommissionPayment.update({
        where: { id: intent.id },
        data: { status: TaxiRideCommissionPaymentStatus.FAILED, failedAt: new Date(), failureReason: "Provider checkout could not be initialized" }
      });
      throw error;
    }
  }

  async verifyOwned(userId: string, transactionReference: string) {
    const intent = await this.prisma.taxiRideCommissionPayment.findFirst({
      where: { transactionReference, driverProfile: { userId } }
    });
    if (!intent) throw new NotFoundException("Captain commission payment not found.");
    if (intent.status === TaxiRideCommissionPaymentStatus.SUCCESSFUL) return { payment: this.safePayment(intent), alreadyProcessed: true, eligibility: await this.policyForProfile(intent.driverProfileId) };
    const provider = this.providers.get(intent.provider);
    const verification = await provider.verify(intent.transactionReference);
    if (!verification.successful) {
      await this.markVerificationFailure(intent.id, "Provider did not confirm a successful payment");
      throw new BadRequestException("Captain commission payment has not been verified.");
    }
    try {
      const result = await this.processVerified(intent.transactionReference, provider.name, verification);
      return { payment: this.safePayment(result.payment), alreadyProcessed: result.duplicate, eligibility: await this.policyForProfile(intent.driverProfileId) };
    } catch (error) {
      if (error instanceof BadRequestException) await this.markVerificationFailure(intent.id, error.message);
      throw error;
    }
  }

  async processWebhook(provider: PaymentProvider, webhook: WebhookPaymentResult) {
    const transactionReference = webhook.transactionReference;
    if (!transactionReference) throw new BadRequestException("Commission payment webhook is missing its reference.");
    if (!webhook.verified || !webhook.successful) return { processed: false, reason: "Webhook was not a verified successful commission payment" };
    const independentlyVerified = await provider.verify(transactionReference);
    if (!independentlyVerified.successful) throw new BadRequestException("Provider verification did not confirm the commission payment.");
    this.assertEvidence(await this.requireIntent(transactionReference), independentlyVerified);
    this.assertEvidence(await this.requireIntent(transactionReference), { ...webhook, transactionReference });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookLog.create({
          data: {
            gateway: provider.name,
            eventType: webhook.eventType,
            transactionReference: webhook.transactionReference,
            payload: webhook.providerResponse as Prisma.InputJsonValue,
            isVerified: true,
            processedAt: new Date()
          }
        });
        return this.processVerifiedWithClient(tx, transactionReference, provider.name, independentlyVerified);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.afterPosted(result);
      return { processed: true, payment: this.safePayment(result.payment), duplicate: result.duplicate };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { processed: false, duplicate: true };
      throw error;
    }
  }

  async adminHistory() {
    const items = await this.prisma.taxiRideCommissionPayment.findMany({
      include: { driverProfile: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" }, take: 250
    });
    return items.map((item) => ({ ...this.safePayment(item), captain: item.driverProfile }));
  }

  private async processVerified(transactionReference: string, provider: string, evidence: VerifyPaymentResult) {
    const result = await this.prisma.$transaction(
      (tx) => this.processVerifiedWithClient(tx, transactionReference, provider, evidence),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    await this.afterPosted(result);
    return result;
  }

  private async processVerifiedWithClient(tx: TransactionClient, transactionReference: string, provider: string, evidence: VerifyPaymentResult) {
    const intent = await tx.taxiRideCommissionPayment.findUnique({ where: { transactionReference } });
    if (!intent) throw new NotFoundException("Captain commission payment not found.");
    if (intent.provider !== provider) throw new BadRequestException("Commission payment provider does not match the intent.");
    if (intent.status === TaxiRideCommissionPaymentStatus.SUCCESSFUL) return { payment: intent, duplicate: true, captainUserId: null as string | null, outstandingKobo: 0 };
    this.assertEvidence(intent, evidence);
    const profile = await tx.taxiDriverProfile.findUnique({ where: { id: intent.driverProfileId }, select: { id: true, userId: true } });
    if (!profile?.userId) throw new NotFoundException("Ride Captain finance profile not found.");
    const settlements = await tx.taxiRideSettlement.findMany({
      where: {
        driverProfileId: profile.id,
        financialOutcome: TaxiRideFinancialOutcome.NORMAL_COMPLETION,
        settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM,
        status: { in: [TaxiRideSettlementStatus.PENDING, TaxiRideSettlementStatus.PARTIALLY_RECONCILED] }
      },
      include: { refunds: { select: { platformResponsibilityKobo: true } } },
      orderBy: { finalizedAt: "asc" }
    });
    const outstandingKobo = settlements.reduce((sum, item) => sum + captainCommissionOutstandingKobo(item), 0);
    if (intent.amountKobo > outstandingKobo) {
      await tx.taxiRideCommissionPayment.update({ where: { id: intent.id }, data: { status: TaxiRideCommissionPaymentStatus.REVIEW_REQUIRED, failureReason: "Verified amount exceeds the remaining authoritative obligation" } });
      throw new ConflictException("Verified commission payment requires Finance review before posting.");
    }
    const providerReference = this.providerReference(evidence.providerResponse);
    if (!providerReference) {
      throw new BadRequestException("Provider verification did not return a commission payment transaction identifier.");
    }
    const remittance = await tx.taxiRideCommissionRemittance.create({
      data: {
        driverProfileId: profile.id,
        reference: transactionReference,
        amountKobo: intent.amountKobo,
        method: provider.toUpperCase(),
        source: TaxiRideCommissionRemittanceSource.PROVIDER_VERIFIED,
        note: "Provider-verified Captain commission payment",
        remittedAt: new Date(),
        recordedByUserId: profile.userId
      }
    });
    let remaining = intent.amountKobo;
    for (const settlement of settlements) {
      if (remaining <= 0) break;
      const due = captainCommissionOutstandingKobo(settlement);
      if (due <= 0) continue;
      const allocated = Math.min(due, remaining);
      await tx.taxiRideCommissionRemittanceAllocation.create({ data: { remittanceId: remittance.id, settlementId: settlement.id, amountKobo: allocated } });
      const remittedKobo = settlement.remittedKobo + allocated;
      const outstanding = captainCommissionOutstandingKobo({ ...settlement, remittedKobo });
      await tx.taxiRideSettlement.update({
        where: { id: settlement.id },
        data: {
          remittedKobo,
          status: outstanding === 0 ? TaxiRideSettlementStatus.RECONCILED : TaxiRideSettlementStatus.PARTIALLY_RECONCILED,
          reconciledAt: outstanding === 0 ? new Date() : null,
          reconciliationReference: outstanding === 0 ? transactionReference : null,
          reconciliationNote: "Provider-verified Captain commission payment"
        }
      });
      await tx.taxiRideFinancialLedgerEntry.create({
        data: {
          settlementId: settlement.id,
          tripId: settlement.tripId,
          idempotencyKey: `ride-finance:provider-remittance:${intent.id}:${settlement.id}`,
          entryType: TaxiRideLedgerEntryType.COMMISSION_REMITTANCE,
          direction: TaxiRideLedgerDirection.PLATFORM_RECEIVABLE_DECREASE,
          amountKobo: allocated,
          actorUserId: profile.userId,
          actorType: TaxiTripActorType.DRIVER,
          reason: `Provider-verified KariGO commission payment ${transactionReference}`,
          reference: transactionReference,
          metadata: { provider, providerReference } as Prisma.InputJsonValue
        }
      });
      remaining -= allocated;
    }
    const payment = await tx.taxiRideCommissionPayment.update({
      where: { id: intent.id },
      data: {
        status: TaxiRideCommissionPaymentStatus.SUCCESSFUL,
        providerTransactionReference: providerReference,
        remittanceId: remittance.id,
        verifiedAt: new Date(),
        failedAt: null,
        failureReason: null
      }
    });
    return { payment, duplicate: false, captainUserId: profile.userId, outstandingKobo: outstandingKobo - intent.amountKobo };
  }

  private async afterPosted(result: { payment: { id: string; amountKobo: number; transactionReference: string }; duplicate: boolean; captainUserId: string | null; outstandingKobo: number }) {
    if (result.duplicate || !result.captainUserId) return;
    await this.audit.record(result.captainUserId, "ride.commission.provider_payment_verified", "TaxiRideCommissionPayment", result.payment.id, {
      reference: result.payment.transactionReference,
      amountKobo: result.payment.amountKobo
    });
    await this.notifications.createNotification({
      userId: result.captainUserId,
      title: "KariGO service fee settled",
      message: `Your verified payment was applied. Outstanding KariGO service fee: NGN ${(result.outstandingKobo / 100).toFixed(2)}.`,
      type: NotificationType.PAYMENT_SUCCESSFUL,
      entityType: "TaxiRideCommissionPayment",
      entityId: result.payment.id
    });
  }

  private async requireIntent(transactionReference: string) {
    const intent = await this.prisma.taxiRideCommissionPayment.findUnique({ where: { transactionReference } });
    if (!intent) throw new NotFoundException("Captain commission payment not found.");
    return intent;
  }

  private assertEvidence(intent: { transactionReference: string; amountKobo: number; currency: string }, evidence: { transactionReference: string; amountMinor?: number; currency?: string }) {
    if (evidence.transactionReference !== intent.transactionReference) throw new BadRequestException("Provider transaction reference does not match the commission payment.");
    if (!evidence.currency || evidence.currency.toUpperCase() !== intent.currency.toUpperCase()) throw new BadRequestException("Provider commission payment currency does not match NGN.");
    if (evidence.amountMinor === undefined || evidence.amountMinor !== intent.amountKobo) throw new BadRequestException("Provider commission payment amount does not match the authoritative outstanding balance.");
  }

  private async outstandingForProfile(driverProfileId: string) {
    const settlements = await this.prisma.taxiRideSettlement.findMany({
      where: {
        driverProfileId,
        financialOutcome: TaxiRideFinancialOutcome.NORMAL_COMPLETION,
        settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM,
        status: { in: [TaxiRideSettlementStatus.PENDING, TaxiRideSettlementStatus.PARTIALLY_RECONCILED] }
      },
      include: { refunds: { select: { platformResponsibilityKobo: true } } }
    });
    return settlements.reduce((sum, item) => sum + captainCommissionOutstandingKobo(item), 0);
  }

  private async policyForProfile(driverProfileId: string) {
    const outstandingKobo = await this.outstandingForProfile(driverProfileId);
    return evaluateRideCommissionEligibility(outstandingKobo, {
      warningKobo: this.config.get<number>("RIDE_CAPTAIN_COMMISSION_WARNING_THRESHOLD_KOBO", DEFAULT_RIDE_COMMISSION_WARNING_THRESHOLD_KOBO),
      urgentKobo: this.config.get<number>("RIDE_CAPTAIN_COMMISSION_URGENT_THRESHOLD_KOBO", DEFAULT_RIDE_COMMISSION_URGENT_THRESHOLD_KOBO),
      blockKobo: this.config.get<number>("RIDE_CAPTAIN_COMMISSION_BLOCK_THRESHOLD_KOBO", DEFAULT_RIDE_COMMISSION_BLOCK_THRESHOLD_KOBO)
    });
  }

  private providerReference(response: Record<string, unknown>) {
    const data = response.data && typeof response.data === "object" && !Array.isArray(response.data) ? response.data as Record<string, unknown> : {};
    const value = data.flw_ref ?? data.id ?? data.transaction_id ?? response.flw_ref ?? response.id;
    return value === undefined || value === null ? null : String(value).slice(0, 160);
  }

  private async markVerificationFailure(id: string, reason: string) {
    await this.prisma.taxiRideCommissionPayment.update({
      where: { id },
      data: { status: TaxiRideCommissionPaymentStatus.VERIFICATION_FAILED, failureReason: reason.slice(0, 300), failedAt: new Date() }
    });
  }

  private safePayment(item: { id: string; transactionReference: string; provider: string; providerTransactionReference: string | null; amountKobo: number; currency: string; status: TaxiRideCommissionPaymentStatus; initiatedAt: Date; verifiedAt: Date | null; createdAt: Date }) {
    return {
      id: item.id,
      reference: item.transactionReference,
      provider: item.provider,
      providerReference: item.providerTransactionReference,
      amountKobo: item.amountKobo,
      currency: item.currency,
      status: item.status,
      initiatedAt: item.initiatedAt.toISOString(),
      verifiedAt: item.verifiedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString()
    };
  }

  private assertEnabled() {
    const enabled = this.config.get<boolean | string>("RIDE_CAPTAIN_COMMISSION_PAYMENT_ENABLED", false);
    if (!(enabled === true || String(enabled).toLowerCase() === "true")) throw new BadRequestException("Online KariGO service fee settlement is temporarily unavailable.");
  }
}
