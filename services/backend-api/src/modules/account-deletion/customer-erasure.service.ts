import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AccountDeletionStatus, AccountStatus, Prisma, UserRole } from "@prisma/client";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestAccountDeletionDto } from "./dto/request-account-deletion.dto";
import { UpdateAccountDeletionRequestDto } from "./dto/admin-account-deletion.dto";
import { CustomerDeletionNoticeService } from "./customer-deletion-notice.service";
import { receiptExpired, retentionExpiry, RETENTION_POLICY_VERSION } from "./retention-policy";
import { heldErasureClient } from "./data-retention.service";
import type { DeletionTombstone } from "./restore-deletion-replay";

export const CUSTOMER_ERASURE_VERSION = 1;
export const CUSTOMER_DELETION_MAX_DAYS = 30;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const tombstone = "Deleted Customer";
const requestInclude = { user: { include: { customerProfile: true, vendor: true, rider: true,
  taxiDriverProfiles: true, vendorApplications: true, deliveryCaptainApplications: true, taxiDriverApplications: true } } } as const;
type Request = Prisma.AccountDeletionRequestGetPayload<{ include: typeof requestInclude }>;

// Preserve narrowly typed reconciliation facts, never arbitrary provider/user JSON.
export function minimizedFinancialMetadata(value: Prisma.JsonValue | null): Prisma.InputJsonObject {
  const allowed = new Set(["providerMode", "walletDebitLedgerEntryId", "walletDebitReference", "walletDebitStatus",
    "walletDebitAmount", "walletReversalLedgerEntryId", "walletReversalReference", "compensationConflict",
    "manualReconciliationRequired", "compensationConflictResolved", "reconciliationAdjustmentReference"]);
  const result: Record<string, string | number | boolean> = { personalDataErased: true };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (!allowed.has(key)) continue;
      if (typeof item === "boolean" || typeof item === "number") result[key] = item;
      else if (typeof item === "string" && /^[A-Za-z0-9._:-]{1,150}$/.test(item)) result[key] = item;
    }
  }
  return result;
}

@Injectable()
export class CustomerErasureService {
  constructor(private readonly prisma: PrismaService, private readonly notice: CustomerDeletionNoticeService) {}

  prepareReceipt() { return { receiptToken: randomBytes(32).toString("base64url") }; }

  async replayTombstone(item: DeletionTombstone) {
    if (process.env.RESTORE_ISOLATED !== "true") throw new ForbiddenException("Deletion replay requires an isolated restore.");
    await this.locked(item.userId, async tx => {
      const user = await tx.user.findUnique({ where: { id: item.userId }, include: requestInclude.user.include });
      if (!user) return; // Required FKs ensure no account-owned rows can outlive a missing user.
      if (user.customerProfile?.id !== item.customerId) throw new ConflictException("Restore Customer identity mismatch; keep isolated.");
      const completedAt = new Date(item.completedAt);
      // Never resend notices, restore a receipt capability, vend, or adjust money.
      const request = await tx.accountDeletionRequest.upsert({ where: { requestReference: item.requestReference },
        create: { userId: user.id, accountType: "CUSTOMER", requestReference: item.requestReference, status: "PROCESSING",
          erasureVersion: CUSTOMER_ERASURE_VERSION, sharedIdentityRetained: item.sharedIdentityRetained,
          policyVersion: RETENTION_POLICY_VERSION, noticeSentAt: completedAt, noticeProviderId: "RESTORE_REPLAY_NO_RESEND" }, update: {}, include: requestInclude });
      if (request.userId !== user.id || request.accountType !== "CUSTOMER") throw new ConflictException("Restore audit mismatch; keep isolated.");
      await tx.user.update({ where: { id: user.id }, data: { customerAccessDeletedAt: user.customerAccessDeletedAt ?? completedAt,
        ...(!item.sharedIdentityRetained ? { deletedAt: user.deletedAt ?? completedAt, accountStatus: "DEACTIVATED" as const } : {}) } });
      request.sharedIdentityRetained = item.sharedIdentityRetained;
      await this.erase(await heldErasureClient(tx), request);
      if (!item.sharedIdentityRetained) await tx.user.update({ where: { id: user.id }, data: { email: null } });
      await tx.accountDeletionRequest.update({ where: { id: request.id }, data: { status: "COMPLETED", completedAt,
        erasurePreparedAt: request.erasurePreparedAt ?? completedAt, receiptTokenHash: null, sharedIdentityRetained: item.sharedIdentityRetained,
        policyVersion: RETENTION_POLICY_VERSION, auditKeepUntil: retentionExpiry("DELETION_AUDIT", completedAt), cleanupErrorCode: null } });
    });
  }

  private async locked<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text AS lock`;
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('karigo-retention-governance'))::text AS lock`;
          return operation(tx);
        }, { timeout: 60_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
        throw error;
      }
    }
  }

  async request(userId: string, dto: RequestAccountDeletionDto) {
    if (dto.confirmation !== "DELETE") throw new BadRequestException("Confirm permanent deletion by typing DELETE.");
    const receiptToken = dto.receiptToken ?? randomBytes(32).toString("base64url");
    if (!/^[A-Za-z0-9_-]{43}$/.test(receiptToken)) throw new BadRequestException("Invalid deletion receipt.");
    return this.locked(userId, async tx => {
      const existing = await tx.accountDeletionRequest.findFirst({ where: { userId, accountType: "CUSTOMER",
        status: { not: "CANCELLED" } }, orderBy: { requestedAt: "desc" } });
      if (existing) {
        if (existing.erasureVersion !== CUSTOMER_ERASURE_VERSION) throw new ConflictException("Existing deletion request requires a separately reviewed remediation plan.");
        if (existing.receiptTokenHash !== hash(receiptToken)) throw new ConflictException("Use the saved receipt for your existing deletion request.");
        return { ...this.receipt(existing), receiptToken, blockers: [], canCancel: false };
      }
      const user = await tx.user.findUnique({ where: { id: userId }, include: requestInclude.user.include });
      if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE || user.customerAccessDeletedAt || !user.customerProfile) {
        throw new BadRequestException("An active Customer account is required.");
      }
      const otherAssociations = await Promise.all([
        tx.vendorTeamMember.count({ where: { userId } }), tx.partnerOnboardingDraft.count({ where: { userId } }),
        tx.partnerCommercialAgreement.count({ where: { applicantUserId: userId } }),
        tx.captainApplicationDocument.count({ where: { userId } }), tx.vendorAccountActivation.count({ where: { userId } }),
        tx.serviceProviderApplication.count({ where: { OR: [{ phoneNumber: user.phoneNumber }, ...(user.email ? [{ email: user.email }] : [])] } })
      ]);
      const sharedIdentityRetained = user.role !== UserRole.CUSTOMER || Boolean(user.vendor || user.rider || user.taxiDriverProfiles.length
        || user.vendorApplications.length || user.deliveryCaptainApplications.length || user.taxiDriverApplications.length || otherAssociations.some(Boolean));
      const now = new Date();
      const created = await tx.accountDeletionRequest.create({ data: { userId, accountType: "CUSTOMER",
        requestReference: `ADR-${randomUUID().toUpperCase()}`, status: "REQUESTED", requestedAt: now, confirmedAt: now,
        reason: null, erasureVersion: CUSTOMER_ERASURE_VERSION, receiptTokenHash: hash(receiptToken),
        sharedIdentityRetained, policyVersion: RETENTION_POLICY_VERSION,
        deadlineAt: new Date(now.getTime() + CUSTOMER_DELETION_MAX_DAYS * 86_400_000) } });
      // Existing JWT/password/refresh paths reject disabled/deleted users. The
      // receipt is read-only and survives sign-out; it cannot buy or cancel.
      await tx.user.update({ where: { id: userId }, data: { customerAccessDeletedAt: now,
        ...(!sharedIdentityRetained ? { accountStatus: AccountStatus.DEACTIVATED, deletedAt: now } : {}) } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.biometricCredential.deleteMany({ where: { userId, ...(sharedIdentityRetained ? { appSurface: "CUSTOMER_APP" as const } : {}) } });
      await tx.deviceToken.deleteMany({ where: { userId, ...(sharedIdentityRetained ? { appSurface: "CUSTOMER_APP" as const } : {}) } });
      await tx.customerWallet.updateMany({ where: { customerId: user.customerProfile.id }, data: { status: "SUSPENDED" } });
      return { ...this.receipt(created), receiptToken, blockers: [], canCancel: false };
    });
  }

  private receipt(request: Pick<Request, "id" | "requestReference" | "status" | "deadlineAt" | "completedAt" | "cleanupErrorCode" | "erasureVersion" | "requestedAt" | "processingStartedAt">) {
    return { id: request.id, requestReference: request.requestReference, accountType: "CUSTOMER", accountTypeLabel: "Customer account",
      status: request.status, phase: request.cleanupErrorCode ? "FAILED" : request.status !== "COMPLETED" && request.deadlineAt && request.deadlineAt < new Date() ? "OVERDUE" : request.status,
      requestedAt: request.requestedAt, processingStartedAt: request.processingStartedAt,
      deadlineAt: request.deadlineAt, completedAt: request.completedAt, erasureVersion: request.erasureVersion,
      message: request.status === "COMPLETED" ? "Your Customer account personal-data deletion is complete. Limited financial/legal records remain only where required."
        : "Permanent deletion requested. Account access is disabled. Completion may take up to 30 days; use this saved receipt to check progress." };
  }

  async publicReceipt(reference: string, token: string) {
    if (!/^ADR-[0-9A-F-]{36}$/i.test(reference)) throw new NotFoundException("Deletion receipt not found.");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token ?? "")) throw new NotFoundException("Deletion receipt not found.");
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { requestReference: reference } });
    const supplied = Buffer.from(hash(token), "hex"), expected = Buffer.from(request?.receiptTokenHash ?? "", "hex");
    if (!request || receiptExpired(request, new Date()) || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new NotFoundException("Deletion receipt not found.");
    return this.receipt(request);
  }

  async recoverReceipt(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token ?? "")) throw new NotFoundException("Deletion receipt not found.");
    const request = await this.prisma.accountDeletionRequest.findFirst({ where: { receiptTokenHash: hash(token), erasureVersion: CUSTOMER_ERASURE_VERSION } });
    if (!request || receiptExpired(request, new Date())) throw new NotFoundException("Deletion receipt not found.");
    return this.receipt(request);
  }

  async review(adminId: string, id: string, dto: UpdateAccountDeletionRequestDto) {
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { id }, include: requestInclude });
    if (!request || request.accountType !== "CUSTOMER" || request.erasureVersion !== CUSTOMER_ERASURE_VERSION) {
      throw new ConflictException("Historical or other-role requests require a separate remediation plan.");
    }
    if (request.status === "COMPLETED") return request;
    if (dto.status !== "COMPLETED") {
      if (!["IN_REVIEW", "PROCESSING", "BLOCKED"].includes(dto.status)) throw new BadRequestException("A permanent deletion request cannot be restored or cancelled here.");
      return this.locked(request.userId, async tx => {
        const current = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
        // A stale Admin screen must never reopen an already completed erasure.
        if (current.status === "COMPLETED") return current;
        return tx.accountDeletionRequest.update({ where: { id }, data: { status: dto.status,
          adminReviewedById: adminId, adminReviewedAt: new Date(), adminNote: null }, include: requestInclude });
      });
    }
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { role: true, adminRole: true, deletedAt: true, accountStatus: true } });
    if (!admin || admin.role !== "ADMIN" || admin.deletedAt || admin.accountStatus !== "ACTIVE" || !["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_OFFICER"].includes(admin.adminRole ?? "")) {
      throw new ForbiddenException("Permanent Customer erasure requires an authorized operations/finance approver.");
    }
    if (dto.confirmCustomerErasure !== "DELETE_CUSTOMER_DATA" || !dto.retentionApproval || !dto.externalCleanupEvidence || (dto.noIdentifiableLegalHoldConfirmed !== true && dto.scopedHoldsReviewed !== true)) {
      throw new BadRequestException("Completion requires erasure confirmation, reviewed record-scoped holds, approved retention-basis and verified external-cleanup evidence.");
    }
    try {
      await this.locked(request.userId, async tx => {
        const current = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
        if (current.status === "COMPLETED" || current.erasurePreparedAt) return;
        await this.assertSafeToErase(tx, current);
        await this.erase(await heldErasureClient(tx), current);
        await tx.accountDeletionRequest.update({ where: { id }, data: { status: "PROCESSING", erasurePreparedAt: new Date(),
          processingStartedAt: current.processingStartedAt ?? new Date(), cleanupErrorCode: null,
          retentionApproval: dto.retentionApproval, externalCleanupEvidence: dto.externalCleanupEvidence,
          reason: null, adminNote: null, blockerSummary: Prisma.JsonNull, adminReviewedById: adminId, adminReviewedAt: new Date() } });
      });
      if (dto.reconciledNoticeProviderId) {
        const pending = await this.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
        if (!pending.erasurePreparedAt || !pending.noticeAttemptedAt || !pending.user.email) throw new ConflictException("There is no ambiguous notice to reconcile.");
        if (!pending.noticeSentAt) {
          await this.notice.verifyExisting(dto.reconciledNoticeProviderId, pending.user.email, pending.requestReference);
          await this.prisma.accountDeletionRequest.update({ where: { id }, data: { noticeSentAt: new Date(), noticeProviderId: dto.reconciledNoticeProviderId } });
        }
      }
      await this.notifyOnce(request.userId, id);
      return await this.locked(request.userId, async tx => {
        const current = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
        if (current.status === "COMPLETED") return current;
        if (!current.erasurePreparedAt || !current.noticeSentAt) throw new ConflictException("Erasure/confirmation is incomplete.");
        if (!current.sharedIdentityRetained) await tx.user.update({ where: { id: current.userId }, data: { email: null } });
        const completedAt = new Date();
        const completed = await tx.accountDeletionRequest.update({ where: { id }, data: {
          status: "COMPLETED", completedAt, auditKeepUntil: retentionExpiry("DELETION_AUDIT", completedAt),
          policyVersion: RETENTION_POLICY_VERSION, cleanupErrorCode: null }, include: requestInclude });
        await tx.adminAuditLog.create({ data: { adminUserId: adminId, action: "CUSTOMER_ERASURE_COMPLETED", entityType: "AccountDeletionRequest", entityId: id,
          newValue: { erasureVersion: CUSTOMER_ERASURE_VERSION, retentionApproval: dto.retentionApproval, externalCleanupEvidence: dto.externalCleanupEvidence } } });
        return completed;
      });
    } catch (error) {
      await this.prisma.accountDeletionRequest.updateMany({ where: { id, status: { not: "COMPLETED" } },
        data: { cleanupErrorCode: "CLEANUP_OR_CONFIRMATION_INCOMPLETE" } });
      // Raw storage/provider/DB errors may contain personal data or secrets.
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException("Deletion cleanup is incomplete. Evidence is preserved; completion was not recorded.");
    }
  }

  private async notifyOnce(userId: string, id: string) {
    const claimed = await this.locked(userId, async tx => {
      const request = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
      if (request.noticeSentAt || request.status === "COMPLETED") return null;
      if (!request.erasurePreparedAt) throw new ConflictException("Cleanup has not succeeded.");
      if (!request.user.email) {
        // The durable, authenticated-by-capability receipt is the confirmation
        // channel when no email exists. It is created once in the same transaction.
        await tx.accountDeletionRequest.update({ where: { id }, data: { noticeSentAt: new Date(), noticeProviderId: "SAVED_RECEIPT" } });
        return null;
      }
      if (request.noticeAttemptedAt) throw new ConflictException("Completion email outcome needs manual provider reconciliation; do not resend.");
      this.notice.assertConfigured();
      await tx.accountDeletionRequest.update({ where: { id }, data: { noticeAttemptedAt: new Date() } });
      return { email: request.user.email, reference: request.requestReference, sharedIdentityRetained: request.sharedIdentityRetained };
    });
    if (!claimed) return;
    const providerId = await this.notice.send(claimed.email, claimed.reference, claimed.sharedIdentityRetained);
    await this.prisma.accountDeletionRequest.update({ where: { id }, data: { noticeSentAt: new Date(), noticeProviderId: providerId } });
  }

  private async assertSafeToErase(tx: Prisma.TransactionClient, request: Request) {
    const user = request.user, customerId = user.customerProfile?.id;
    if (!customerId) throw new ConflictException("Customer scope is missing.");
    if (!request.sharedIdentityRetained) {
      const newRoles = await Promise.all([tx.partnerOnboardingDraft.count({ where: { userId: user.id } }),
        tx.vendorTeamMember.count({ where: { userId: user.id } }), tx.partnerCommercialAgreement.count({ where: { applicantUserId: user.id } }),
        tx.captainApplicationDocument.count({ where: { userId: user.id } }), tx.vendorAccountActivation.count({ where: { userId: user.id } })]);
      if (user.role !== "CUSTOMER" || user.vendor || user.rider || user.taxiDriverProfiles.length || user.vendorApplications.length
        || user.deliveryCaptainApplications.length || user.taxiDriverApplications.length || newRoles.some(Boolean)) {
        throw new ConflictException("Role scope changed after confirmation; resolve the scoped identity before erasure.");
      }
    }
    if (Number(user.customerProfile!.loyaltyBalance) !== 0) throw new ConflictException("Unresolved loyalty/reward value requires financial review before erasure.");
    // External asset/provider deletion is attested by the required evidence
    // reference; arbitrary URLs are never fetched or deleted by this service.
    const blockers = await Promise.all([
      tx.customerWallet.count({ where: { customerId, OR: [{ availableBalance: { not: 0 } }, { ledgerBalance: { not: 0 } }] } }),
      tx.order.count({ where: { customerId, orderStatus: { notIn: ["DRAFT", "COMPLETED", "CANCELLED", "FAILED", "REFUNDED", "VENDOR_REJECTED"] } } }),
      tx.taxiTrip.count({ where: { customerId, status: { notIn: ["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"] } } }),
      tx.utilityTransaction.count({ where: { customerId, status: { in: ["PENDING", "PROCESSING"] } } }),
      tx.payment.count({ where: { customerId, paymentStatus: { in: ["PENDING", "REFUND_PENDING", "CASH_PENDING"] } } }),
      tx.supportTicket.count({ where: { customerId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      tx.serviceProviderRequest.count({ where: { customerId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      tx.taxiRideSettlement.count({ where: { customerId, disputeOpenedAt: { not: null }, disputeResolvedAt: null } }),
      tx.taxiRideRefund.count({ where: { settlement: { customerId }, status: "CASH_REFUND_DUE" } }),
      tx.taxiRideReceiptEmailDelivery.count({ where: { trip: { customerId }, status: "PROCESSING" } }),
      tx.serviceProviderRequest.count({ where: { serviceAddress: { userId: user.id }, customerId: { not: customerId } } })
    ]);
    if (blockers.some(Boolean)) throw new ConflictException("Unresolved balances, transactions, work, disputes or in-flight emails must be reconciled before erasure.");
    const conflicts = await tx.utilityTransaction.findMany({ where: { customerId }, select: { metadata: true } });
    if (conflicts.some(row => row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      && row.metadata.manualReconciliationRequired === true)) throw new ConflictException("Utility compensation evidence requires financial reconciliation first.");
  }

  private async erase(tx: Prisma.TransactionClient, request: Request) {
    const userId = request.userId, customerId = request.user.customerProfile!.id;
    const orders = { customerId }, trips = { customerId };
    const payments = await tx.payment.findMany({ where: { customerId }, select: { transactionReference: true, id: true } });
    const owned = await Promise.all([tx.order.findMany({ where: orders, select: { id: true } }),
      tx.utilityTransaction.findMany({ where: { customerId }, select: { id: true, metadata: true } }),
      tx.taxiTrip.findMany({ where: trips, select: { id: true } }), tx.address.findMany({ where: { userId }, select: { id: true } }),
      tx.supportTicket.findMany({ where: { customerId }, select: { id: true } })]);
    const entityIds = [...(request.sharedIdentityRetained ? [] : [userId]), customerId, request.id, ...payments.map(row => row.id), ...owned.flatMap(rows => rows.map(row => row.id))];
    const childEntities = await Promise.all([
      tx.orderItem.findMany({ where: { order: orders }, select: { id: true } }),
      tx.orderStatusHistory.findMany({ where: { order: orders }, select: { id: true } }),
      tx.serviceProviderRequest.findMany({ where: { customerId }, select: { id: true } }),
      tx.serviceProviderReview.findMany({ where: { customerId }, select: { id: true } }),
      tx.supportTicketMessage.findMany({ where: { OR: [{ senderUserId: userId }, { ticket: { customerId } }] }, select: { id: true } }),
      tx.taxiRideReceipt.findMany({ where: { trip: trips }, select: { id: true } }),
      tx.taxiRideSettlement.findMany({ where: { customerId }, select: { id: true } }),
      tx.customerWalletLedgerEntry.findMany({ where: { customerId }, select: { id: true } })
    ]);
    entityIds.push(...childEntities.flatMap(rows => rows.map(row => row.id)));
    await tx.refreshToken.deleteMany({ where: { userId } });
    if (!request.sharedIdentityRetained) await tx.otpVerification.deleteMany({ where: { userId } });
    await tx.biometricCredential.deleteMany({ where: { userId, ...(request.sharedIdentityRetained ? { appSurface: "CUSTOMER_APP" as const } : {}) } });
    await tx.deviceToken.deleteMany({ where: { userId, ...(request.sharedIdentityRetained ? { appSurface: "CUSTOMER_APP" as const } : {}) } });
    await tx.notification.deleteMany({ where: { userId } });
    if (!request.sharedIdentityRetained) {
      await tx.phoneChangeRequest.deleteMany({ where: { userId } });
      await tx.userLoginActivity.updateMany({ where: { userId }, data: { userId: null, phoneNumberMasked: null, reason: null } });
      await tx.accountSecurityEvent.updateMany({ where: { userId }, data: { metadata: Prisma.JsonNull } });
    }
    await tx.serviceProviderReview.deleteMany({ where: { customerId } });
    await tx.supportTicketMessage.deleteMany({ where: { OR: [{ senderUserId: userId, ...(request.sharedIdentityRetained ? { senderRole: "CUSTOMER" } : {}) }, { ticket: { customerId } }] } });
    await tx.supportTicket.deleteMany({ where: { customerId } });
    await tx.serviceProviderRequest.deleteMany({ where: { customerId } });
    await tx.order.updateMany({ where: orders, data: { pickupAddressId: null, deliveryAddressId: null,
      recipientName: null, recipientPhone: null, itemDescription: null, deliveryOtp: null, customerNote: null, cancellationReason: null, cashReconciliationNote: null } });
    await tx.order.updateMany({ where: { pickupAddress: { userId } }, data: { pickupAddressId: null } });
    await tx.order.updateMany({ where: { deliveryAddress: { userId } }, data: { deliveryAddressId: null } });
    await tx.orderItem.updateMany({ where: { order: orders }, data: { specialInstruction: null } });
    await tx.orderItem.updateMany({ where: { order: orders, productId: null }, data: { productName: "Personal item details removed" } });
    await tx.orderStatusHistory.updateMany({ where: request.sharedIdentityRetained ? { order: orders } : { OR: [{ order: orders }, { changedByUserId: userId }] }, data: { note: null } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.taxiRideTracePoint.deleteMany({ where: { trip: trips } });
    await tx.taxiRideCallSession.deleteMany({ where: request.sharedIdentityRetained ? { trip: trips } : { OR: [{ trip: trips }, { initiatorUserId: userId }, { recipientUserId: userId }] } });
    await tx.taxiTripEvent.updateMany({ where: request.sharedIdentityRetained ? { trip: trips } : { OR: [{ trip: trips }, { actorId: userId }] }, data: { actorId: null, note: null, metadata: Prisma.JsonNull } });
    await tx.taxiTrip.updateMany({ where: trips, data: { pickupAddress: tombstone, destinationAddress: tombstone,
      pickupLatitude: null, pickupLongitude: null, destinationLatitude: null, destinationLongitude: null,
      tripPinHash: null, tripPinEncrypted: null, tripPinLastFour: null, customerNote: null, driverNote: null, cancellationReason: null } });
    await tx.taxiRideReceipt.updateMany({ where: { trip: trips }, data: { pickupAddress: tombstone, destinationAddress: tombstone, city: null } });
    await tx.taxiRideReceiptEmailDelivery.deleteMany({ where: { trip: trips } });
    await tx.taxiRideSettlement.updateMany({ where: { customerId }, data: { disputeReason: null, reconciliationNote: null } });
    await tx.taxiRideRefund.updateMany({ where: { settlement: { customerId } }, data: { reason: "Personal details removed on account deletion", note: null } });
    await tx.taxiRideFinancialLedgerEntry.updateMany({ where: { trip: trips }, data: { reason: "Personal details removed on account deletion", metadata: Prisma.JsonNull } });
    for (const row of owned[1]) {
      await tx.utilityTransaction.update({ where: { id: row.id }, data: { recipient: tombstone, recipientName: null, mockToken: null,
        customerNote: null, failureReason: null, metadata: minimizedFinancialMetadata("metadata" in row ? row.metadata as Prisma.JsonValue : null) } });
    }
    await tx.payment.updateMany({ where: { customerId }, data: { gatewayResponse: Prisma.JsonNull } });
    await tx.paymentWebhookLog.updateMany({ where: { transactionReference: { in: payments.map(row => row.transactionReference) } }, data: { payload: { personalDataErased: true } } });
    const ledger = await tx.customerWalletLedgerEntry.findMany({ where: { customerId }, select: { id: true, metadata: true } });
    for (const row of ledger) await tx.customerWalletLedgerEntry.update({ where: { id: row.id }, data: { description: null, metadata: minimizedFinancialMetadata(row.metadata) } });
    await tx.customerWallet.updateMany({ where: { customerId }, data: { status: "CLOSED" } });
    await tx.customerReferral.updateMany({ where: { OR: [{ referrerCustomerId: customerId }, { referredCustomerId: customerId }] },
      data: { referralCode: `deleted-${customerId}`, adminNote: null, metadata: Prisma.JsonNull } });
    await tx.customerReferralProfile.updateMany({ where: { customerId }, data: { code: `deleted-${customerId}`, status: "SUSPENDED", shareEnabled: false } });
    await tx.customerProfile.updateMany({ where: { referredBy: customerId }, data: { referredBy: null } });
    await tx.customerProfile.update({ where: { id: customerId }, data: { referralCode: `deleted-${customerId}`, referredBy: null,
      requireRidePin: false, averageRating: null, totalOrders: 0, loyaltyBalance: 0 } });
    await tx.controlledOperationsCustomer.deleteMany({ where: { userId } });
    await tx.taxiWaitlistEntry.deleteMany({ where: { OR: [{ phoneNumber: request.user.phoneNumber }, ...(request.user.email ? [{ email: request.user.email }] : [])] } });
    await tx.smeServicesPilotParticipant.deleteMany({ where: { OR: [{ relatedUserId: userId }, { phoneNumber: request.user.phoneNumber }, ...(request.user.email ? [{ email: request.user.email }] : [])] } });
    await tx.launchCohortMember.deleteMany({ where: { userId } });
    await tx.launchDrillEvent.updateMany({ where: { drill: { customerUserId: userId } }, data: { note: null, metadata: Prisma.JsonNull } });
    await tx.launchDrill.updateMany({ where: { customerUserId: userId }, data: { customerUserId: null, controlledCustomerId: null, notes: null, evidenceReference: null } });
    await tx.adminAuditLog.updateMany({ where: { entityId: { in: entityIds } }, data: { oldValue: Prisma.JsonNull, newValue: Prisma.JsonNull, ipAddress: null } });
    await tx.accountDeletionRequest.updateMany({ where: { userId }, data: { reason: null, adminNote: null, blockerSummary: Prisma.JsonNull } });
    if (!request.sharedIdentityRetained) await tx.user.update({ where: { id: userId }, data: { fullName: tombstone, phoneNumber: `deleted:${userId}`, passwordHash: "",
      profilePhotoUrl: null, phoneVerified: false, emailVerified: false, onboardingPasswordSetAt: null, lastLoginAt: null } });
    // Email alone remains until the durable notice outcome is confirmed. No
    // plaintext email is copied to a job/outbox/audit row.
  }
}
