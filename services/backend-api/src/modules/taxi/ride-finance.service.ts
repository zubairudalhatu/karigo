import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationChannel,
  NotificationType,
  Prisma,
  TaxiRideAdjustmentDirection,
  TaxiRideFinancialBalanceTarget,
  TaxiRideFinancialOutcome,
  TaxiRideFinancialResponsibility,
  TaxiRideLedgerDirection,
  TaxiRideLedgerEntryType,
  TaxiRideRefundStatus,
  TaxiRideSettlementDirection,
  TaxiRideSettlementStatus,
  TaxiTripActorType
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  AllocateRideRefundResponsibilityDto,
  CreateRideFinancialAdjustmentDto,
  CreateRideRefundDto,
  ListRideFinanceQueryDto,
  RecordRideCommissionRemittanceDto,
  SettleCashRideRefundDto
} from "./dto/ride-finance.dto";

const MONEY_LIMIT_KOBO = 1_000_000_000;

export function calculateRideSettlementMoney(finalFareKobo: number, commissionRateBasisPoints: number) {
  if (!Number.isSafeInteger(finalFareKobo) || finalFareKobo < 0 || finalFareKobo > MONEY_LIMIT_KOBO) {
    throw new BadRequestException("Final Ride fare must be a safe non-negative integer in kobo.");
  }
  if (!Number.isInteger(commissionRateBasisPoints) || commissionRateBasisPoints < 0 || commissionRateBasisPoints > 10_000) {
    throw new BadRequestException("KariGO commission basis points must be between 0 and 10000.");
  }
  const karigoCommissionKobo = Math.round((finalFareKobo * commissionRateBasisPoints) / 10_000);
  return {
    grossFareKobo: finalFareKobo,
    karigoCommissionKobo,
    captainNetEarningKobo: finalFareKobo - karigoCommissionKobo
  };
}

export interface CompletedRideSettlementInput {
  tripId: string;
  tripReference: string;
  driverProfileId: string;
  customerId: string;
  captainName: string;
  serviceArea?: string | null;
  rideCategory: string;
  paymentMethod: string;
  rideFareKobo: number;
  waitingChargeKobo: number;
  discountKobo: number;
  finalCustomerFareKobo: number;
  finalizedAt: Date;
  actorUserId: string;
}

@Injectable()
export class RideFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService
  ) {}

  commissionRatePercent() {
    return this.config.get<number>(
      "RIDE_KARIGO_COMMISSION_PERCENT",
      this.config.get<number>("RIDE_CAPTAIN_COMMISSION_PERCENT", 10)
    );
  }

  commissionRateBasisPoints() {
    return Math.round(this.commissionRatePercent() * 100);
  }

  async createCompletedSettlement(tx: Prisma.TransactionClient, input: CompletedRideSettlementInput) {
    const basisPoints = this.commissionRateBasisPoints();
    const money = calculateRideSettlementMoney(input.finalCustomerFareKobo, basisPoints);
    const paymentMethod = input.paymentMethod.trim().toUpperCase() || "CASH";
    const isCash = paymentMethod === "CASH";
    const settlement = await tx.taxiRideSettlement.upsert({
      where: { tripId: input.tripId },
      update: {},
      create: {
        tripId: input.tripId,
        driverProfileId: input.driverProfileId,
        customerId: input.customerId,
        tripReference: input.tripReference,
        captainName: input.captainName,
        serviceArea: input.serviceArea,
        rideCategory: input.rideCategory,
        paymentMethod,
        financialOutcome: TaxiRideFinancialOutcome.NORMAL_COMPLETION,
        grossFareKobo: money.grossFareKobo,
        rideFareKobo: input.rideFareKobo,
        waitingChargeKobo: input.waitingChargeKobo,
        discountKobo: input.discountKobo,
        finalCustomerFareKobo: input.finalCustomerFareKobo,
        commissionRateBasisPoints: basisPoints,
        karigoCommissionKobo: money.karigoCommissionKobo,
        captainGrossEarningKobo: money.grossFareKobo,
        captainNetEarningKobo: money.captainNetEarningKobo,
        cashCollectedKobo: isCash ? money.grossFareKobo : 0,
        platformReceivableKobo: isCash ? money.karigoCommissionKobo : 0,
        captainReceivableKobo: isCash ? 0 : money.captainNetEarningKobo,
        settlementDirection: isCash ? TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM : TaxiRideSettlementDirection.PLATFORM_TO_CAPTAIN,
        status: TaxiRideSettlementStatus.PENDING,
        finalizedAt: input.finalizedAt
      }
    });
    await tx.taxiRideFinancialLedgerEntry.createMany({
      data: [
        this.ledger(settlement.id, input.tripId, `ride-finance:${input.tripId}:fare`, TaxiRideLedgerEntryType.RIDE_FARE_FINALIZED, TaxiRideLedgerDirection.CASH_POSITION, money.grossFareKobo, input.actorUserId, TaxiTripActorType.DRIVER, "Authoritative final customer Ride fare committed"),
        this.ledger(settlement.id, input.tripId, `ride-finance:${input.tripId}:captain-earning`, TaxiRideLedgerEntryType.CAPTAIN_EARNING_CREATED, TaxiRideLedgerDirection.CAPTAIN_EARNING_INCREASE, money.captainNetEarningKobo, input.actorUserId, TaxiTripActorType.DRIVER, "Captain net Ride earning snapshot created"),
        this.ledger(settlement.id, input.tripId, `ride-finance:${input.tripId}:commission`, TaxiRideLedgerEntryType.KARIGO_COMMISSION_CREATED, TaxiRideLedgerDirection.PLATFORM_RECEIVABLE_INCREASE, money.karigoCommissionKobo, input.actorUserId, TaxiTripActorType.SYSTEM, "KariGO commission snapshot created"),
        this.ledger(settlement.id, input.tripId, `ride-finance:${input.tripId}:cash-collected`, TaxiRideLedgerEntryType.CASH_COLLECTED, TaxiRideLedgerDirection.CASH_POSITION, isCash ? money.grossFareKobo : 0, input.actorUserId, TaxiTripActorType.SYSTEM, isCash ? "Captain collected the final Cash fare" : "No Cash collection recorded")
      ],
      skipDuplicates: true
    });
    return settlement;
  }

  async createClosedRideOutcome(tx: Prisma.TransactionClient, input: {
    tripId: string; tripReference: string; customerId: string; driverProfileId?: string | null; captainName?: string | null;
    serviceArea?: string | null; rideCategory: string; paymentMethod?: string; finalizedAt: Date; actorUserId: string; actorType: TaxiTripActorType;
    reviewRequired: boolean; reason: string;
  }) {
    const outcome = input.reviewRequired ? TaxiRideFinancialOutcome.FINANCIAL_REVIEW_REQUIRED : TaxiRideFinancialOutcome.ZERO_VALUE_CANCELLATION;
    const status = input.reviewRequired ? TaxiRideSettlementStatus.DISPUTED : TaxiRideSettlementStatus.CANCELLED;
    const settlement = await tx.taxiRideSettlement.upsert({
      where: { tripId: input.tripId },
      update: {},
      create: {
        tripId: input.tripId, tripReference: input.tripReference, customerId: input.customerId,
        driverProfileId: input.driverProfileId, captainName: input.captainName, serviceArea: input.serviceArea,
        rideCategory: input.rideCategory, paymentMethod: input.paymentMethod ?? "CASH", financialOutcome: outcome,
        grossFareKobo: 0, rideFareKobo: 0, finalCustomerFareKobo: 0, commissionRateBasisPoints: this.commissionRateBasisPoints(),
        karigoCommissionKobo: 0, captainGrossEarningKobo: 0, captainNetEarningKobo: 0,
        settlementDirection: TaxiRideSettlementDirection.NONE, status, finalizedAt: input.finalizedAt,
        disputeReason: input.reviewRequired ? input.reason : null,
        disputeOpenedAt: input.reviewRequired ? input.finalizedAt : null
      }
    });
    await tx.taxiRideFinancialLedgerEntry.createMany({
      data: [this.ledger(settlement.id, input.tripId, `ride-finance:${input.tripId}:closed-outcome`, TaxiRideLedgerEntryType.ZERO_VALUE_CANCELLATION, TaxiRideLedgerDirection.NONE, 0, input.actorUserId, input.actorType, input.reason)],
      skipDuplicates: true
    });
    return settlement;
  }

  async notifyEarningFinalized(tripId: string) {
    const settlement = await this.prisma.taxiRideSettlement.findUnique({
      where: { tripId },
      include: { driverProfile: { select: { userId: true } } }
    });
    if (!settlement?.driverProfile?.userId || settlement.financialOutcome !== TaxiRideFinancialOutcome.NORMAL_COMPLETION) return;
    await this.notify(settlement.driverProfile.userId, "Ride earning finalized", `${settlement.tripReference}: ${this.money(settlement.captainNetEarningKobo)} earnings after ${this.money(settlement.karigoCommissionKobo)} KariGO service fee.`, "RIDE_EARNING_FINALIZED", tripId);
  }

  async captainStatement(userId: string) {
    const profile = await this.prisma.taxiDriverProfile.findUnique({ where: { userId }, select: { id: true, fullName: true } });
    if (!profile) throw new NotFoundException("Ride Captain finance profile not found.");
    const [settlements, remittances] = await Promise.all([
      this.prisma.taxiRideSettlement.findMany({
        where: { driverProfileId: profile.id },
        include: { refunds: { orderBy: { createdAt: "desc" } } },
        orderBy: { finalizedAt: "desc" }, take: 250
      }),
      this.prisma.taxiRideCommissionRemittance.findMany({
        where: { driverProfileId: profile.id }, include: { allocations: true }, orderBy: { remittedAt: "desc" }, take: 250
      })
    ]);
    const normal = settlements.filter((item) => item.financialOutcome === TaxiRideFinancialOutcome.NORMAL_COMPLETION);
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(today.getDate() - today.getDay());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const sumSince = (from: Date) => normal.filter((item) => item.finalizedAt >= from).reduce((sum, item) => sum + item.captainNetEarningKobo + item.captainAdjustmentKobo, 0);
    return {
      captain: { id: profile.id, fullName: profile.fullName },
      todayEarningsKobo: sumSince(today), thisWeekEarningsKobo: sumSince(week), thisMonthEarningsKobo: sumSince(month),
      totalEarningsKobo: normal.reduce((sum, item) => sum + item.captainNetEarningKobo + item.captainAdjustmentKobo, 0),
      cashCollectedKobo: normal.reduce((sum, item) => sum + item.cashCollectedKobo, 0),
      karigoCommissionDueKobo: normal.reduce((sum, item) => sum + this.outstandingPlatform(item), 0),
      karigoCommissionRemittedKobo: normal.reduce((sum, item) => sum + item.remittedKobo, 0),
      settlements: normal.map((item) => this.captainSettlement(item)),
      remittances: remittances.map((item) => ({ id: item.id, reference: item.reference, amountKobo: item.amountKobo, method: item.method, note: item.note, remittedAt: item.remittedAt.toISOString(), allocatedKobo: item.allocations.reduce((sum, allocation) => sum + allocation.amountKobo, 0) }))
    };
  }

  async customerTripSummary(userId: string, tripId: string) {
    const settlement = await this.prisma.taxiRideSettlement.findFirst({
      where: { tripId, customer: { userId } }, include: { refunds: { orderBy: { approvedAt: "desc" } } }
    });
    if (!settlement) return null;
    return this.customerSettlement(settlement);
  }

  async adminSettlements(query: ListRideFinanceQueryDto) {
    const where = this.financeWhere(query);
    const settlements = await this.prisma.taxiRideSettlement.findMany({
      where,
      include: {
        driverProfile: { select: { id: true, fullName: true } },
        customer: { select: { user: { select: { fullName: true } } } },
        refunds: { orderBy: { approvedAt: "desc" } },
        remittanceAllocations: { include: { remittance: { select: { reference: true, remittedAt: true } } } }
      },
      orderBy: { finalizedAt: "desc" }, take: 500
    });
    return settlements.map((item) => this.adminSettlement(item));
  }

  async adminSummary(query: ListRideFinanceQueryDto) {
    const items = await this.prisma.taxiRideSettlement.findMany({ where: this.financeWhere(query), include: { refunds: true, ledgerEntries: { select: { entryType: true, amountKobo: true } } } });
    const normal = items.filter((item) => item.financialOutcome === TaxiRideFinancialOutcome.NORMAL_COMPLETION);
    return {
      effectiveKarigoCommissionPercent: this.commissionRatePercent(),
      completedRides: normal.length,
      grossRideFaresKobo: normal.reduce((sum, item) => sum + item.finalCustomerFareKobo, 0),
      karigoCommissionKobo: normal.reduce((sum, item) => sum + item.karigoCommissionKobo, 0),
      captainEarningsKobo: normal.reduce((sum, item) => sum + item.captainNetEarningKobo + item.captainAdjustmentKobo, 0),
      cashCollectedByCaptainsKobo: normal.reduce((sum, item) => sum + item.cashCollectedKobo, 0),
      platformCommissionOutstandingKobo: normal.reduce((sum, item) => sum + this.outstandingPlatform(item), 0),
      commissionReconciledKobo: normal.reduce((sum, item) => sum + item.remittedKobo, 0),
      refundsApprovedKobo: items.reduce((sum, item) => sum + item.refundedKobo, 0),
      refundsPendingKobo: items.flatMap((item) => item.refunds).filter((refund) => refund.status === TaxiRideRefundStatus.CASH_REFUND_DUE).reduce((sum, refund) => sum + refund.amountKobo, 0),
      unresolvedAdjustments: items.reduce((sum, item) => sum + item.ledgerEntries.filter((entry) => entry.entryType === TaxiRideLedgerEntryType.CREDIT || entry.entryType === TaxiRideLedgerEntryType.DEBIT_ADJUSTMENT).length, 0),
      disputedBalanceKobo: items.filter((item) => item.status === TaxiRideSettlementStatus.DISPUTED).reduce((sum, item) => sum + this.outstandingPlatform(item), 0)
    };
  }

  async adminCaptainSummaries(query: ListRideFinanceQueryDto) {
    const items = await this.prisma.taxiRideSettlement.findMany({ where: this.financeWhere(query), include: { driverProfile: { select: { id: true, fullName: true } } } });
    const grouped = new Map<string, { driverProfileId: string; captainName: string; grossFaresKobo: number; captainEarningsKobo: number; karigoCommissionDueKobo: number; commissionRemittedKobo: number; outstandingKobo: number; refundsKobo: number }>();
    for (const item of items) {
      if (!item.driverProfileId) continue;
      const value = grouped.get(item.driverProfileId) ?? { driverProfileId: item.driverProfileId, captainName: item.driverProfile?.fullName ?? item.captainName ?? "Ride Captain", grossFaresKobo: 0, captainEarningsKobo: 0, karigoCommissionDueKobo: 0, commissionRemittedKobo: 0, outstandingKobo: 0, refundsKobo: 0 };
      value.grossFaresKobo += item.finalCustomerFareKobo;
      value.captainEarningsKobo += item.captainNetEarningKobo + item.captainAdjustmentKobo;
      value.karigoCommissionDueKobo += item.platformReceivableKobo + item.platformAdjustmentKobo;
      value.commissionRemittedKobo += item.remittedKobo;
      value.outstandingKobo += this.outstandingPlatform(item);
      value.refundsKobo += item.refundedKobo;
      grouped.set(item.driverProfileId, value);
    }
    return [...grouped.values()].sort((a, b) => b.outstandingKobo - a.outstandingKobo);
  }

  async recordRemittance(adminUserId: string, dto: RecordRideCommissionRemittanceDto) {
    const reference = dto.reference.trim().toUpperCase();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.taxiRideCommissionRemittance.findUnique({ where: { reference } });
        if (duplicate) throw new ConflictException("This commission remittance reference has already been recorded.");
        const profile = await tx.taxiDriverProfile.findUnique({ where: { id: dto.driverProfileId }, select: { id: true, userId: true, fullName: true } });
        if (!profile) throw new NotFoundException("Ride Captain profile not found.");
        const settlements = await tx.taxiRideSettlement.findMany({
          where: { driverProfileId: profile.id, settlementDirection: TaxiRideSettlementDirection.CAPTAIN_TO_PLATFORM, status: { in: [TaxiRideSettlementStatus.PENDING, TaxiRideSettlementStatus.PARTIALLY_RECONCILED] } },
          orderBy: { finalizedAt: "asc" }
        });
        const totalOutstanding = settlements.reduce((sum, item) => sum + this.outstandingPlatform(item), 0);
        if (dto.amountKobo > totalOutstanding) throw new BadRequestException("Commission remittance cannot exceed the Captain's undisputed outstanding KariGO balance.");
        const remittance = await tx.taxiRideCommissionRemittance.create({ data: { driverProfileId: profile.id, reference, amountKobo: dto.amountKobo, method: dto.method.trim().toUpperCase(), note: dto.note?.trim(), remittedAt: dto.remittedAt ? new Date(dto.remittedAt) : new Date(), recordedByUserId: adminUserId } });
        let remaining = dto.amountKobo;
        for (const settlement of settlements) {
          if (remaining <= 0) break;
          const due = this.outstandingPlatform(settlement);
          if (due <= 0) continue;
          const allocated = Math.min(due, remaining);
          await tx.taxiRideCommissionRemittanceAllocation.create({ data: { remittanceId: remittance.id, settlementId: settlement.id, amountKobo: allocated } });
          const remittedKobo = settlement.remittedKobo + allocated;
          const outstanding = Math.max(0, settlement.platformReceivableKobo + settlement.platformAdjustmentKobo - remittedKobo);
          await tx.taxiRideSettlement.update({ where: { id: settlement.id }, data: { remittedKobo, status: outstanding === 0 ? TaxiRideSettlementStatus.RECONCILED : TaxiRideSettlementStatus.PARTIALLY_RECONCILED, reconciledAt: outstanding === 0 ? new Date() : null, reconciliationReference: outstanding === 0 ? reference : null, reconciliationNote: dto.note?.trim() } });
          await tx.taxiRideFinancialLedgerEntry.create({ data: this.ledger(settlement.id, settlement.tripId, `ride-finance:remittance:${remittance.id}:${settlement.id}`, TaxiRideLedgerEntryType.COMMISSION_REMITTANCE, TaxiRideLedgerDirection.PLATFORM_RECEIVABLE_DECREASE, allocated, adminUserId, TaxiTripActorType.ADMIN, `KariGO commission remittance ${reference} recorded`, reference) });
          remaining -= allocated;
        }
        return { remittance, profile, outstandingKobo: totalOutstanding - dto.amountKobo };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.audit.record(adminUserId, "admin.taxi.finance.commission_remittance_recorded", "TaxiRideCommissionRemittance", result.remittance.id, { driverProfileId: dto.driverProfileId, amountKobo: dto.amountKobo, reference });
      if (result.profile.userId) await this.notify(result.profile.userId, "KariGO commission remittance recorded", `${this.money(dto.amountKobo)} was applied. Outstanding KariGO balance: ${this.money(result.outstandingKobo)}.`, "RIDE_COMMISSION_REMITTANCE", result.remittance.id);
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("This commission remittance reference has already been recorded.");
      throw error;
    }
  }

  async approveRefund(adminUserId: string, tripId: string, dto: CreateRideRefundDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.taxiRideSettlement.findUnique({ where: { tripId }, include: { trip: { include: { customer: { include: { user: { select: { id: true } } } }, driverProfile: { select: { userId: true } } } } } });
      if (!settlement || settlement.financialOutcome !== TaxiRideFinancialOutcome.NORMAL_COMPLETION) throw new BadRequestException("Only a completed financially earnable Ride can be refunded.");
      const duplicate = await tx.taxiRideRefund.findUnique({ where: { idempotencyKey: dto.idempotencyKey.trim() } });
      if (duplicate) {
        if (duplicate.settlementId === settlement.id && duplicate.amountKobo === dto.amountKobo) return { settlement, refund: duplicate, duplicate: true };
        throw new ConflictException("Refund idempotency key is already in use.");
      }
      if (dto.amountKobo > settlement.finalCustomerFareKobo - settlement.refundedKobo) throw new BadRequestException("Refund cannot exceed the original customer charge less previous refunds.");
      const responsibility = dto.responsibility ?? TaxiRideFinancialResponsibility.REVIEW_REQUIRED;
      const allocation = this.refundAllocation(dto.amountKobo, responsibility, dto.platformResponsibilityKobo, dto.captainResponsibilityKobo);
      const refund = await tx.taxiRideRefund.create({ data: { settlementId: settlement.id, idempotencyKey: dto.idempotencyKey.trim(), amountKobo: dto.amountKobo, responsibility, platformResponsibilityKobo: allocation.platform, captainResponsibilityKobo: allocation.captain, reason: dto.reason.trim(), note: dto.note?.trim(), approvedByUserId: adminUserId } });
      await tx.taxiRideSettlement.update({ where: { id: settlement.id }, data: { refundedKobo: { increment: dto.amountKobo }, platformAdjustmentKobo: { increment: -allocation.platform }, captainAdjustmentKobo: { increment: -allocation.captain }, status: responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? TaxiRideSettlementStatus.DISPUTED : TaxiRideSettlementStatus.REFUND_PENDING, disputeReason: responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? "Refund responsibility requires Finance allocation" : settlement.disputeReason, disputeOpenedAt: responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? new Date() : settlement.disputeOpenedAt } });
      await tx.taxiRideFinancialLedgerEntry.create({ data: { ...this.ledger(settlement.id, settlement.tripId, `ride-finance:refund:${refund.id}:approved`, TaxiRideLedgerEntryType.REFUND_APPROVED, TaxiRideLedgerDirection.CUSTOMER_REFUND_OBLIGATION, dto.amountKobo, adminUserId, TaxiTripActorType.ADMIN, dto.reason.trim()), financialResponsibility: responsibility } });
      return { settlement, refund, duplicate: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result.duplicate) {
      await this.audit.record(adminUserId, "admin.taxi.finance.cash_refund_approved", "TaxiRideRefund", result.refund.id, { tripId, amountKobo: dto.amountKobo, responsibility: result.refund.responsibility });
      const customer = await this.prisma.taxiTrip.findUnique({ where: { id: tripId }, select: { customer: { select: { userId: true } } } });
      if (customer) await this.notify(customer.customer.userId, "Cash Ride refund approved", `${this.money(dto.amountKobo)} is approved and pending Cash refund confirmation.`, "RIDE_REFUND_APPROVED", tripId);
    }
    return result.refund;
  }

  async settleCashRefund(adminUserId: string, refundId: string, dto: SettleCashRideRefundDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.taxiRideRefund.findUnique({ where: { id: refundId }, include: { settlement: { include: { trip: { include: { customer: { select: { userId: true } }, driverProfile: { select: { userId: true } } } } } } } });
      if (!refund) throw new NotFoundException("Ride refund not found.");
      const reference = dto.reference.trim().toUpperCase();
      if (refund.status === TaxiRideRefundStatus.CASH_REFUND_SETTLED) {
        if (refund.externalReference === reference) return { refund, customerUserId: refund.settlement.trip.customer.userId, duplicate: true };
        throw new ConflictException("Cash refund has already been settled.");
      }
      const updated = await tx.taxiRideRefund.update({ where: { id: refund.id }, data: { status: TaxiRideRefundStatus.CASH_REFUND_SETTLED, externalReference: reference, method: dto.method.trim().toUpperCase(), note: dto.note?.trim() ?? refund.note, settledByUserId: adminUserId, settledAt: new Date() } });
      await tx.taxiRideFinancialLedgerEntry.create({ data: this.ledger(refund.settlementId, refund.settlement.tripId, `ride-finance:refund:${refund.id}:settled`, TaxiRideLedgerEntryType.REFUND_SETTLED, TaxiRideLedgerDirection.CUSTOMER_REFUND_OBLIGATION, refund.amountKobo, adminUserId, TaxiTripActorType.ADMIN, `Cash refund settled by ${dto.method.trim()}`, reference) });
      const pending = await tx.taxiRideRefund.count({ where: { settlementId: refund.settlementId, status: TaxiRideRefundStatus.CASH_REFUND_DUE, id: { not: refund.id } } });
      if (refund.responsibility !== TaxiRideFinancialResponsibility.REVIEW_REQUIRED) {
        await tx.taxiRideSettlement.update({ where: { id: refund.settlementId }, data: { status: pending ? TaxiRideSettlementStatus.REFUND_PENDING : this.reconciliationState(refund.settlement), reconciledAt: pending ? null : this.reconciliationState(refund.settlement) === TaxiRideSettlementStatus.RECONCILED ? new Date() : refund.settlement.reconciledAt } });
      }
      return { refund: updated, customerUserId: refund.settlement.trip.customer.userId, duplicate: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result.duplicate) {
      await this.audit.record(adminUserId, "admin.taxi.finance.cash_refund_settled", "TaxiRideRefund", refundId, { reference: dto.reference.trim().toUpperCase(), method: dto.method.trim().toUpperCase() });
      await this.notify(result.customerUserId, "Cash Ride refund settled", `${this.money(result.refund.amountKobo)} Cash refund was confirmed as received.`, "RIDE_REFUND_SETTLED", result.refund.settlementId);
    }
    return result.refund;
  }

  async allocateRefundResponsibility(adminUserId: string, refundId: string, dto: AllocateRideRefundResponsibilityDto) {
    if (dto.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED) {
      throw new BadRequestException("Choose Platform, Captain or Shared responsibility to resolve the allocation review.");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.taxiRideRefund.findUnique({
        where: { id: refundId },
        include: { settlement: { include: { driverProfile: { select: { userId: true } }, refunds: true } } }
      });
      if (!refund) throw new NotFoundException("Ride refund not found.");
      if (refund.responsibility !== TaxiRideFinancialResponsibility.REVIEW_REQUIRED) {
        throw new ConflictException("Refund responsibility has already been allocated.");
      }
      const allocation = this.refundAllocation(refund.amountKobo, dto.responsibility, dto.platformResponsibilityKobo, dto.captainResponsibilityKobo);
      const updatedRefund = await tx.taxiRideRefund.update({
        where: { id: refund.id },
        data: {
          responsibility: dto.responsibility,
          platformResponsibilityKobo: allocation.platform,
          captainResponsibilityKobo: allocation.captain,
          note: dto.resolutionNote.trim()
        }
      });
      const otherUnallocated = refund.settlement.refunds.some((item) => item.id !== refund.id && item.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED);
      const pendingRefund = refund.settlement.refunds.some((item) => item.id === refund.id ? refund.status === TaxiRideRefundStatus.CASH_REFUND_DUE : item.status === TaxiRideRefundStatus.CASH_REFUND_DUE);
      const status = otherUnallocated
        ? TaxiRideSettlementStatus.DISPUTED
        : pendingRefund ? TaxiRideSettlementStatus.REFUND_PENDING : this.reconciliationState(refund.settlement);
      const settlement = await tx.taxiRideSettlement.update({
        where: { id: refund.settlementId },
        data: {
          platformAdjustmentKobo: { increment: -allocation.platform },
          captainAdjustmentKobo: { increment: -allocation.captain },
          status,
          disputeResolvedAt: otherUnallocated ? null : new Date(),
          reconciliationNote: dto.resolutionNote.trim(),
          reconciledAt: status === TaxiRideSettlementStatus.RECONCILED ? new Date() : null
        }
      });
      await tx.taxiRideFinancialLedgerEntry.create({ data: { ...this.ledger(refund.settlementId, refund.settlement.tripId, `ride-finance:refund:${refund.id}:allocation`, TaxiRideLedgerEntryType.DEBIT_ADJUSTMENT, TaxiRideLedgerDirection.CUSTOMER_REFUND_OBLIGATION, refund.amountKobo, adminUserId, TaxiTripActorType.ADMIN, dto.resolutionNote.trim()), financialResponsibility: dto.responsibility, metadata: { platformResponsibilityKobo: allocation.platform, captainResponsibilityKobo: allocation.captain } as Prisma.InputJsonValue } });
      return { refund: updatedRefund, settlement, captainUserId: refund.settlement.driverProfile?.userId, captainResponsibilityKobo: allocation.captain };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record(adminUserId, "admin.taxi.finance.refund_responsibility_allocated", "TaxiRideRefund", refundId, { responsibility: dto.responsibility, platformResponsibilityKobo: result.refund.platformResponsibilityKobo, captainResponsibilityKobo: result.refund.captainResponsibilityKobo, resolutionNote: dto.resolutionNote.trim() });
    if (result.captainUserId && result.captainResponsibilityKobo > 0) await this.notify(result.captainUserId, "Ride refund allocation recorded", `${this.money(result.captainResponsibilityKobo)} was allocated to the Captain position for ${result.settlement.tripReference}.`, "RIDE_REFUND_ALLOCATION", result.settlement.tripId);
    return result.refund;
  }

  async createAdjustment(adminUserId: string, tripId: string, dto: CreateRideFinancialAdjustmentDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.taxiRideSettlement.findUnique({ where: { tripId }, include: { driverProfile: { select: { userId: true } } } });
      if (!settlement) throw new NotFoundException("Ride settlement not found.");
      const key = dto.idempotencyKey.trim();
      const existing = await tx.taxiRideFinancialLedgerEntry.findUnique({ where: { idempotencyKey: key } });
      if (existing) return { settlement, entry: existing, duplicate: true, captainUserId: settlement.driverProfile?.userId };
      const platformDelta = dto.target === TaxiRideFinancialBalanceTarget.PLATFORM_RECEIVABLE ? (dto.direction === TaxiRideAdjustmentDirection.DEBIT ? dto.amountKobo : -dto.amountKobo) : 0;
      const captainDelta = dto.target === TaxiRideFinancialBalanceTarget.CAPTAIN_EARNING ? (dto.direction === TaxiRideAdjustmentDirection.CREDIT ? dto.amountKobo : -dto.amountKobo) : 0;
      const updated = await tx.taxiRideSettlement.update({ where: { id: settlement.id }, data: { platformAdjustmentKobo: { increment: platformDelta }, captainAdjustmentKobo: { increment: captainDelta }, status: dto.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? TaxiRideSettlementStatus.DISPUTED : settlement.status, disputeReason: dto.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? dto.reason.trim() : settlement.disputeReason, disputeOpenedAt: dto.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED ? new Date() : settlement.disputeOpenedAt } });
      const entryType = dto.direction === TaxiRideAdjustmentDirection.CREDIT ? TaxiRideLedgerEntryType.CREDIT : TaxiRideLedgerEntryType.DEBIT_ADJUSTMENT;
      const direction = dto.target === TaxiRideFinancialBalanceTarget.PLATFORM_RECEIVABLE ? (platformDelta >= 0 ? TaxiRideLedgerDirection.PLATFORM_RECEIVABLE_INCREASE : TaxiRideLedgerDirection.PLATFORM_RECEIVABLE_DECREASE) : (captainDelta >= 0 ? TaxiRideLedgerDirection.CAPTAIN_EARNING_INCREASE : TaxiRideLedgerDirection.CAPTAIN_EARNING_DECREASE);
      const entry = await tx.taxiRideFinancialLedgerEntry.create({ data: { ...this.ledger(settlement.id, settlement.tripId, key, entryType, direction, dto.amountKobo, adminUserId, TaxiTripActorType.ADMIN, dto.reason.trim()), financialResponsibility: dto.responsibility, metadata: { target: dto.target, note: dto.note?.trim() } as Prisma.InputJsonValue } });
      return { settlement: updated, entry, duplicate: false, captainUserId: settlement.driverProfile?.userId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result.duplicate) {
      await this.audit.record(adminUserId, "admin.taxi.finance.adjustment_created", "TaxiRideFinancialLedgerEntry", result.entry.id, { tripId, amountKobo: dto.amountKobo, direction: dto.direction, target: dto.target, responsibility: dto.responsibility });
      if (result.captainUserId) await this.notify(result.captainUserId, "Ride financial adjustment recorded", `${this.money(dto.amountKobo)} adjustment was recorded for ${result.settlement.tripReference}.`, "RIDE_FINANCIAL_ADJUSTMENT", tripId);
    }
    return result.entry;
  }

  async openDispute(adminUserId: string, tripId: string, reason: string, note?: string) {
    const settlement = await this.prisma.$transaction(async (tx) => {
      const current = await tx.taxiRideSettlement.findUnique({ where: { tripId } });
      if (!current) throw new NotFoundException("Ride settlement not found.");
      if (current.status === TaxiRideSettlementStatus.DISPUTED) return current;
      const updated = await tx.taxiRideSettlement.update({ where: { id: current.id }, data: { status: TaxiRideSettlementStatus.DISPUTED, disputeReason: reason.trim(), disputeOpenedAt: new Date(), disputeResolvedAt: null, reconciliationNote: note?.trim() } });
      await tx.taxiRideFinancialLedgerEntry.create({ data: this.ledger(current.id, tripId, `ride-finance:${tripId}:dispute:${Date.now()}`, TaxiRideLedgerEntryType.DISPUTE_OPENED, TaxiRideLedgerDirection.NONE, 0, adminUserId, TaxiTripActorType.ADMIN, reason.trim()) });
      return updated;
    });
    await this.audit.record(adminUserId, "admin.taxi.finance.dispute_opened", "TaxiRideSettlement", settlement.id, { tripId, reason: reason.trim() });
    return settlement;
  }

  async resolveDispute(adminUserId: string, tripId: string, resolutionNote: string) {
    const settlement = await this.prisma.$transaction(async (tx) => {
      const current = await tx.taxiRideSettlement.findUnique({ where: { tripId }, include: { refunds: true } });
      if (!current) throw new NotFoundException("Ride settlement not found.");
      if (current.status !== TaxiRideSettlementStatus.DISPUTED) throw new BadRequestException("Ride settlement is not in financial review.");
      if (current.refunds.some((refund) => refund.responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED)) throw new BadRequestException("Allocate refund responsibility before resolving this financial review.");
      const pendingRefund = current.refunds.some((refund) => refund.status === TaxiRideRefundStatus.CASH_REFUND_DUE);
      const status = pendingRefund ? TaxiRideSettlementStatus.REFUND_PENDING : this.reconciliationState(current);
      const updated = await tx.taxiRideSettlement.update({ where: { id: current.id }, data: { status, disputeResolvedAt: new Date(), reconciliationNote: resolutionNote.trim(), reconciledAt: status === TaxiRideSettlementStatus.RECONCILED ? new Date() : null } });
      await tx.taxiRideFinancialLedgerEntry.create({ data: this.ledger(current.id, tripId, `ride-finance:${tripId}:dispute-resolved:${Date.now()}`, TaxiRideLedgerEntryType.DISPUTE_RESOLVED, TaxiRideLedgerDirection.NONE, 0, adminUserId, TaxiTripActorType.ADMIN, resolutionNote.trim()) });
      return updated;
    });
    await this.audit.record(adminUserId, "admin.taxi.finance.dispute_resolved", "TaxiRideSettlement", settlement.id, { tripId, resolutionNote: resolutionNote.trim() });
    return settlement;
  }

  async exportCsv(query: ListRideFinanceQueryDto) {
    const rows = await this.adminSettlements(query);
    const header = ["ride_reference", "date", "captain", "fare_kobo", "commission_rate_basis_points", "karigo_commission_kobo", "captain_earning_kobo", "payment_method", "direction", "status", "outstanding_kobo"];
    const csv = [header, ...rows.map((row) => [row.tripReference, row.finalizedAt, row.captain?.fullName ?? "", row.finalCustomerFareKobo, row.commissionRateBasisPoints, row.karigoCommissionKobo, row.captainNetEarningKobo, row.paymentMethod, row.settlementDirection, row.status, row.outstandingPlatformKobo])]
      .map((values) => values.map((value) => this.csvCell(value)).join(",")).join("\n");
    return { fileName: `karigo-ride-finance-${new Date().toISOString().slice(0, 10)}.csv`, csv };
  }

  private financeWhere(query: ListRideFinanceQueryDto): Prisma.TaxiRideSettlementWhereInput {
    return {
      ...(query.driverProfileId ? { driverProfileId: query.driverProfileId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.dateFrom || query.dateTo) ? { finalizedAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {})
    };
  }

  private ledger(settlementId: string, tripId: string, idempotencyKey: string, entryType: TaxiRideLedgerEntryType, direction: TaxiRideLedgerDirection, amountKobo: number, actorUserId: string | null, actorType: TaxiTripActorType, reason: string, reference?: string): Prisma.TaxiRideFinancialLedgerEntryCreateManyInput {
    return { settlementId, tripId, idempotencyKey, entryType, direction, amountKobo, actorUserId, actorType, reason, reference };
  }

  private outstandingPlatform(settlement: { platformReceivableKobo: number; platformAdjustmentKobo: number; remittedKobo: number }) {
    return Math.max(0, settlement.platformReceivableKobo + settlement.platformAdjustmentKobo - settlement.remittedKobo);
  }

  private reconciliationState(settlement: { platformReceivableKobo: number; platformAdjustmentKobo: number; remittedKobo: number; financialOutcome: TaxiRideFinancialOutcome }) {
    if (settlement.financialOutcome !== TaxiRideFinancialOutcome.NORMAL_COMPLETION) return TaxiRideSettlementStatus.CANCELLED;
    if (this.outstandingPlatform(settlement) === 0) return TaxiRideSettlementStatus.RECONCILED;
    return settlement.remittedKobo > 0 ? TaxiRideSettlementStatus.PARTIALLY_RECONCILED : TaxiRideSettlementStatus.PENDING;
  }

  private refundAllocation(amountKobo: number, responsibility: TaxiRideFinancialResponsibility, platform?: number, captain?: number) {
    if (responsibility === TaxiRideFinancialResponsibility.PLATFORM) return { platform: amountKobo, captain: 0 };
    if (responsibility === TaxiRideFinancialResponsibility.CAPTAIN) return { platform: 0, captain: amountKobo };
    if (responsibility === TaxiRideFinancialResponsibility.REVIEW_REQUIRED) return { platform: 0, captain: 0 };
    const platformAmount = platform ?? 0;
    const captainAmount = captain ?? 0;
    if (!Number.isSafeInteger(platformAmount) || !Number.isSafeInteger(captainAmount) || platformAmount < 0 || captainAmount < 0 || platformAmount + captainAmount !== amountKobo) throw new BadRequestException("Shared refund responsibility amounts must be non-negative integer kobo and equal the refund amount.");
    return { platform: platformAmount, captain: captainAmount };
  }

  private customerSettlement(settlement: Prisma.TaxiRideSettlementGetPayload<{ include: { refunds: true } }>) {
    const pending = settlement.refunds.some((refund) => refund.status === TaxiRideRefundStatus.CASH_REFUND_DUE);
    return {
      originalTotalKobo: settlement.finalCustomerFareKobo,
      refundedKobo: settlement.refundedKobo,
      currentNetChargedKobo: Math.max(0, settlement.finalCustomerFareKobo - settlement.refundedKobo),
      refundStatus: settlement.refundedKobo === 0 ? "NONE" : pending ? "CASH_REFUND_DUE" : "CASH_REFUND_SETTLED",
      refunds: settlement.refunds.map((refund) => ({ id: refund.id, amountKobo: refund.amountKobo, status: refund.status, approvedAt: refund.approvedAt.toISOString(), settledAt: refund.settledAt?.toISOString() ?? null }))
    };
  }

  private captainSettlement(settlement: Prisma.TaxiRideSettlementGetPayload<{ include: { refunds: true } }>) {
    return { id: settlement.id, tripId: settlement.tripId, tripReference: settlement.tripReference, finalizedAt: settlement.finalizedAt.toISOString(), rideCategory: settlement.rideCategory, grossCustomerFareKobo: settlement.finalCustomerFareKobo, karigoCommissionKobo: settlement.karigoCommissionKobo, captainAdjustmentKobo: settlement.captainAdjustmentKobo, captainEarningKobo: settlement.captainNetEarningKobo + settlement.captainAdjustmentKobo, cashCollectedKobo: settlement.cashCollectedKobo, commissionRemittedKobo: settlement.remittedKobo, outstandingKarigoCommissionKobo: this.outstandingPlatform(settlement), status: settlement.status, direction: settlement.settlementDirection, refundedKobo: settlement.refundedKobo };
  }

  private adminSettlement(settlement: any) {
    return { id: settlement.id, tripId: settlement.tripId, tripReference: settlement.tripReference, finalizedAt: settlement.finalizedAt.toISOString(), captain: settlement.driverProfile, customerName: settlement.customer.user.fullName, serviceArea: settlement.serviceArea, rideCategory: settlement.rideCategory, paymentMethod: settlement.paymentMethod, financialOutcome: settlement.financialOutcome, finalCustomerFareKobo: settlement.finalCustomerFareKobo, rideFareKobo: settlement.rideFareKobo, waitingChargeKobo: settlement.waitingChargeKobo, discountKobo: settlement.discountKobo, commissionRateBasisPoints: settlement.commissionRateBasisPoints, karigoCommissionKobo: settlement.karigoCommissionKobo, captainNetEarningKobo: settlement.captainNetEarningKobo + settlement.captainAdjustmentKobo, cashCollectedKobo: settlement.cashCollectedKobo, platformReceivableKobo: settlement.platformReceivableKobo + settlement.platformAdjustmentKobo, remittedKobo: settlement.remittedKobo, outstandingPlatformKobo: this.outstandingPlatform(settlement), refundedKobo: settlement.refundedKobo, settlementDirection: settlement.settlementDirection, status: settlement.status, disputeReason: settlement.disputeReason, refunds: settlement.refunds.map((refund: any) => ({ id: refund.id, amountKobo: refund.amountKobo, status: refund.status, responsibility: refund.responsibility, approvedAt: refund.approvedAt.toISOString(), settledAt: refund.settledAt?.toISOString() ?? null })) };
  }

  private async notify(userId: string, title: string, message: string, event: string, entityId: string) {
    const notice = { userId, title, message, type: NotificationType.SYSTEM_ALERT, entityType: "TaxiRideFinance", entityId, metadata: { event } };
    await Promise.allSettled([this.notifications.createNotification(notice), this.notifications.createNotification({ ...notice, channel: NotificationChannel.PUSH })]);
  }

  private money(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

  private csvCell(value: unknown) {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }
}
