import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountDeletionAccountType,
  AccountDeletionBlockedReasonCode,
  AccountDeletionStatus,
  AccountStatus,
  OrderStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  TaxiDriverProfileStatus,
  TaxiTripStatus,
  UserRole,
  VendorBranchStatus,
  VendorStatus
} from "@prisma/client";
import { randomUUID } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ListAccountDeletionRequestsQueryDto, UpdateAccountDeletionRequestDto } from "./dto/admin-account-deletion.dto";
import { CancelAccountDeletionDto, RequestAccountDeletionDto } from "./dto/request-account-deletion.dto";

const openRequestStatuses = [
  AccountDeletionStatus.REQUESTED,
  AccountDeletionStatus.BLOCKED,
  AccountDeletionStatus.IN_REVIEW,
  AccountDeletionStatus.PROCESSING
];

const activeOrderStatuses = [
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.VENDOR_CONFIRMING,
  OrderStatus.VENDOR_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.RIDER_ARRIVING_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
  OrderStatus.ARRIVED_DESTINATION,
  OrderStatus.REFUND_REQUESTED
];

const activeRideStatuses = [
  TaxiTripStatus.REQUESTED,
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED,
  TaxiTripStatus.ARRIVED_PICKUP,
  TaxiTripStatus.STARTED,
  TaxiTripStatus.ARRIVED_DESTINATION
];

const pendingSettlementStatuses = [SettlementStatus.PENDING, SettlementStatus.PROCESSING];
const terminalRequestStatuses: AccountDeletionStatus[] = [
  AccountDeletionStatus.COMPLETED,
  AccountDeletionStatus.CANCELLED
];

const cancellableStatuses: AccountDeletionStatus[] = [
  AccountDeletionStatus.REQUESTED,
  AccountDeletionStatus.BLOCKED,
  AccountDeletionStatus.IN_REVIEW
];

const accountDeletionUserInclude = {
  customerProfile: true,
  rider: true,
  vendor: {
    include: {
      branches: true
    }
  },
  taxiDriverProfiles: true,
  deliveryCaptainApplications: { select: { id: true, status: true }, take: 1 },
  taxiDriverApplications: { select: { id: true, status: true }, take: 1 },
  vendorApplications: { select: { id: true, status: true }, take: 1 },
  captainWorkState: true
} satisfies Prisma.UserInclude;

type AccountDeletionUserContext = Prisma.UserGetPayload<{ include: typeof accountDeletionUserInclude }>;
type AccountDeletionRequestWithUser = Prisma.AccountDeletionRequestGetPayload<{ include: { user: { include: typeof accountDeletionUserInclude }, adminReviewedBy: true } }>;

export interface DeletionBlocker {
  code: AccountDeletionBlockedReasonCode;
  message: string;
  count: number;
}

function requestReference() {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `ADR-${day}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function safeReason(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 1000) : null;
}

function blockerSummary(blockers: DeletionBlocker[]) {
  return { blockers } as unknown as Prisma.InputJsonValue;
}

function firstBlockerCode(blockers: DeletionBlocker[]) {
  return blockers[0]?.code ?? null;
}

function accountTypeLabel(accountType: AccountDeletionAccountType) {
  switch (accountType) {
    case AccountDeletionAccountType.CUSTOMER: return "Customer account";
    case AccountDeletionAccountType.CAPTAIN: return "Captain access";
    case AccountDeletionAccountType.PARTNER: return "Partner business access";
    case AccountDeletionAccountType.COMPLETE_ACCOUNT: return "Complete KariGO account";
    default: return "KariGO account";
  }
}

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  async currentStatus(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: openRequestStatuses } },
      orderBy: { requestedAt: "desc" },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    return request ? this.toResponse(request) : null;
  }

  async request(userId: string, dto: RequestAccountDeletionDto) {
    const user = await this.loadUser(userId);
    this.assertAccountScope(user, dto.accountType);

    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, accountType: dto.accountType, status: { in: openRequestStatuses } },
      orderBy: { requestedAt: "desc" },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    if (existing) return this.toResponse(existing);

    const blockers = await this.collectBlockers(user, dto.accountType);
    const created = await this.prisma.accountDeletionRequest.create({
      data: {
        requestReference: requestReference(),
        userId,
        accountType: dto.accountType,
        reason: safeReason(dto.reason),
        confirmedAt: new Date(),
        status: blockers.length ? AccountDeletionStatus.BLOCKED : AccountDeletionStatus.REQUESTED,
        blockedReasonCode: firstBlockerCode(blockers),
        blockerSummary: blockers.length ? blockerSummary(blockers) : Prisma.JsonNull
      },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });

    return this.toResponse(created);
  }

  async cancel(userId: string, dto: CancelAccountDeletionDto) {
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: cancellableStatuses } },
      orderBy: { requestedAt: "desc" },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    if (!existing) throw new NotFoundException("No cancellable account deletion request was found.");

    const updated = await this.prisma.accountDeletionRequest.update({
      where: { id: existing.id },
      data: {
        status: AccountDeletionStatus.CANCELLED,
        cancelledAt: new Date(),
        adminNote: dto.reason ? `Cancelled by account owner: ${safeReason(dto.reason)}` : existing.adminNote
      },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    return this.toResponse(updated);
  }

  async adminList(query: ListAccountDeletionRequestsQueryDto) {
    const where: Prisma.AccountDeletionRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.accountType ? { accountType: query.accountType } : {})
    };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { requestReference: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { phoneNumber: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } }
      ];
    }

    const requests = await this.prisma.accountDeletionRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: 100,
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    return requests.map((request) => this.toResponse(request));
  }

  async adminDetail(requestId: string) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    if (!request) throw new NotFoundException("Account deletion request was not found.");
    const blockers = await this.collectBlockers(request.user, request.accountType);
    return this.toResponse(request, blockers);
  }

  async adminUpdate(adminUserId: string, requestId: string, dto: UpdateAccountDeletionRequestDto) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
    });
    if (!request) throw new NotFoundException("Account deletion request was not found.");
    if (terminalRequestStatuses.includes(request.status)) {
      throw new BadRequestException("Completed or cancelled deletion requests cannot be changed.");
    }

    const now = new Date();
    const blockers = await this.collectBlockers(request.user, request.accountType);
    if (dto.status === AccountDeletionStatus.PROCESSING && blockers.length) {
      const blocked = await this.prisma.accountDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: AccountDeletionStatus.BLOCKED,
          blockedReasonCode: firstBlockerCode(blockers),
          blockerSummary: blockerSummary(blockers),
          adminNote: safeReason(dto.adminNote),
          adminReviewedById: adminUserId,
          adminReviewedAt: now
        },
        include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
      });
      await this.audit.record(adminUserId, "ACCOUNT_DELETION_BLOCKED", "AccountDeletionRequest", request.id, {
        requestReference: request.requestReference,
        accountType: request.accountType,
        blockers
      });
      return this.toResponse(blocked, blockers);
    }

    if (dto.status === AccountDeletionStatus.BLOCKED && !dto.blockedReasonCode && !blockers.length) {
      throw new BadRequestException("Blocked deletion requests require a blocked reason.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === AccountDeletionStatus.PROCESSING) {
        await this.applyProcessingSafeguards(tx, request.user, request.accountType, now);
      }
      if (dto.status === AccountDeletionStatus.COMPLETED) {
        await this.applyProcessingSafeguards(tx, request.user, request.accountType, now);
        await this.applyCompletionSafeguards(tx, request.user, request.accountType, now);
      }

      return tx.accountDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: dto.status,
          blockedReasonCode: dto.status === AccountDeletionStatus.BLOCKED
            ? dto.blockedReasonCode ?? firstBlockerCode(blockers)
            : null,
          blockerSummary: blockers.length ? blockerSummary(blockers) : Prisma.JsonNull,
          adminNote: safeReason(dto.adminNote),
          adminReviewedById: adminUserId,
          adminReviewedAt: now,
          processingStartedAt: dto.status === AccountDeletionStatus.PROCESSING ? now : request.processingStartedAt,
          completedAt: dto.status === AccountDeletionStatus.COMPLETED ? now : request.completedAt,
          cancelledAt: dto.status === AccountDeletionStatus.CANCELLED ? now : request.cancelledAt
        },
        include: { user: { include: accountDeletionUserInclude }, adminReviewedBy: true }
      });
    });

    await this.audit.record(adminUserId, `ACCOUNT_DELETION_${dto.status}`, "AccountDeletionRequest", request.id, {
      requestReference: request.requestReference,
      accountType: request.accountType,
      adminNote: safeReason(dto.adminNote)
    });
    return this.toResponse(updated, blockers);
  }

  private async loadUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: accountDeletionUserInclude
    });
    if (!user) throw new NotFoundException("Account was not found.");
    return user;
  }

  private assertAccountScope(user: AccountDeletionUserContext, accountType: AccountDeletionAccountType) {
    const allowed = accountType === AccountDeletionAccountType.COMPLETE_ACCOUNT ||
      (accountType === AccountDeletionAccountType.CUSTOMER && Boolean(user.customerProfile || user.role === UserRole.CUSTOMER)) ||
      (accountType === AccountDeletionAccountType.CAPTAIN && Boolean(
        user.rider ||
        user.taxiDriverProfiles.length ||
        user.deliveryCaptainApplications.length ||
        user.taxiDriverApplications.length ||
        user.role === UserRole.RIDER
      )) ||
      (accountType === AccountDeletionAccountType.PARTNER && Boolean(
        user.vendor ||
        user.vendorApplications.length ||
        user.role === UserRole.VENDOR
      ));

    if (!allowed) {
      throw new ForbiddenException(`${accountTypeLabel(accountType)} is not available for this signed-in user.`);
    }
  }

  private affectsCustomer(accountType: AccountDeletionAccountType) {
    return accountType === AccountDeletionAccountType.CUSTOMER || accountType === AccountDeletionAccountType.COMPLETE_ACCOUNT;
  }

  private affectsCaptain(accountType: AccountDeletionAccountType) {
    return accountType === AccountDeletionAccountType.CAPTAIN || accountType === AccountDeletionAccountType.COMPLETE_ACCOUNT;
  }

  private affectsPartner(accountType: AccountDeletionAccountType) {
    return accountType === AccountDeletionAccountType.PARTNER || accountType === AccountDeletionAccountType.COMPLETE_ACCOUNT;
  }

  private async collectBlockers(user: AccountDeletionUserContext, accountType: AccountDeletionAccountType): Promise<DeletionBlocker[]> {
    const blockers: DeletionBlocker[] = [];

    if (this.affectsCustomer(accountType) && user.customerProfile) {
      const [activeOrders, activeRides] = await Promise.all([
        this.prisma.order.count({
          where: { customerId: user.customerProfile.id, orderStatus: { in: activeOrderStatuses } }
        }),
        this.prisma.taxiTrip.count({
          where: { customerId: user.customerProfile.id, status: { in: activeRideStatuses } }
        })
      ]);
      if (activeOrders) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.ACTIVE_ORDER_EXISTS,
          count: activeOrders,
          message: "Customer account has active orders that must be completed, cancelled or reconciled first."
        });
      }
      if (activeRides) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.ACTIVE_RIDE_EXISTS,
          count: activeRides,
          message: "Customer account has active ride requests that must be closed first."
        });
      }
    }

    if (this.affectsCaptain(accountType)) {
      const riderId = user.rider?.id;
      const driverProfileIds = user.taxiDriverProfiles.map((profile) => profile.id);
      const [activeDeliveries, pendingEarnings, activeRides] = await Promise.all([
        riderId ? this.prisma.order.count({
          where: { riderId, orderStatus: { in: activeOrderStatuses } }
        }) : Promise.resolve(0),
        riderId ? this.prisma.riderEarning.count({
          where: { riderId, payoutStatus: { in: pendingSettlementStatuses } }
        }) : Promise.resolve(0),
        driverProfileIds.length ? this.prisma.taxiTrip.count({
          where: { driverProfileId: { in: driverProfileIds }, status: { in: activeRideStatuses } }
        }) : Promise.resolve(0)
      ]);
      if (activeDeliveries) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.ACTIVE_DELIVERY_EXISTS,
          count: activeDeliveries,
          message: "Captain access has active delivery assignments that must be closed first."
        });
      }
      if (activeRides) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.ACTIVE_RIDE_EXISTS,
          count: activeRides,
          message: "Captain access has active ride assignments that must be closed first."
        });
      }
      if (pendingEarnings) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.PENDING_EARNING_EXISTS,
          count: pendingEarnings,
          message: "Captain access has pending earnings or settlement records that must be reviewed first."
        });
      }
    }

    if (this.affectsPartner(accountType) && user.vendor) {
      const [openOrders, pendingSettlements] = await Promise.all([
        this.prisma.order.count({
          where: { vendorId: user.vendor.id, orderStatus: { in: activeOrderStatuses } }
        }),
        this.prisma.vendorSettlement.count({
          where: { vendorId: user.vendor.id, settlementStatus: { in: pendingSettlementStatuses } }
        })
      ]);
      if (openOrders) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.OPEN_PARTNER_ORDER_EXISTS,
          count: openOrders,
          message: "Partner business access has open orders that must be completed, cancelled or reconciled first."
        });
      }
      if (pendingSettlements) {
        blockers.push({
          code: AccountDeletionBlockedReasonCode.PENDING_SETTLEMENT_EXISTS,
          count: pendingSettlements,
          message: "Partner business access has pending settlement records that must be reviewed first."
        });
      }
    }

    return blockers;
  }

  private async applyProcessingSafeguards(
    tx: Prisma.TransactionClient,
    user: AccountDeletionUserContext,
    accountType: AccountDeletionAccountType,
    now: Date
  ) {
    await tx.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now }
    });

    if (this.affectsCaptain(accountType)) {
      await tx.rider.updateMany({
        where: { userId: user.id },
        data: { availabilityStatus: RiderStatus.OFFLINE }
      });
      await tx.taxiDriverProfile.updateMany({
        where: { userId: user.id },
        data: { isAvailableForTaxi: false }
      });
      await tx.captainWorkState.updateMany({
        where: { userId: user.id },
        data: {
          desiredDeliveryOnline: false,
          desiredRideOnline: false,
          activeWorkMode: null,
          activeDeliveryAssignmentId: null,
          activeRideTripId: null,
          lockStage: null,
          lastAvailabilityChangeAt: now,
          version: { increment: 1 }
        }
      });
    }

    if (this.affectsPartner(accountType)) {
      const vendor = user.vendor;
      if (vendor) {
        await tx.vendor.update({ where: { id: vendor.id }, data: { isOpen: false } });
        await tx.vendorBranch.updateMany({
          where: { vendorId: vendor.id },
          data: { status: VendorBranchStatus.INACTIVE }
        });
      }
    }
  }

  private async applyCompletionSafeguards(
    tx: Prisma.TransactionClient,
    user: AccountDeletionUserContext,
    accountType: AccountDeletionAccountType,
    now: Date
  ) {
    if (this.affectsCaptain(accountType)) {
      await tx.rider.updateMany({
        where: { userId: user.id },
        data: {
          availabilityStatus: RiderStatus.OFFLINE,
          verificationStatus: RiderStatus.SUSPENDED,
          deletedAt: now
        }
      });
      await tx.taxiDriverProfile.updateMany({
        where: { userId: user.id },
        data: {
          status: TaxiDriverProfileStatus.DEACTIVATED,
          isAvailableForTaxi: false
        }
      });
    }

    if (this.affectsPartner(accountType) && user.vendor) {
      await tx.vendor.update({
        where: { id: user.vendor.id },
        data: {
          status: VendorStatus.CLOSED,
          isOpen: false,
          deletedAt: now
        }
      });
      await tx.vendorBranch.updateMany({
        where: { vendorId: user.vendor.id },
        data: { status: VendorBranchStatus.CLOSED }
      });
    }

    if (accountType === AccountDeletionAccountType.CUSTOMER || accountType === AccountDeletionAccountType.COMPLETE_ACCOUNT) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          accountStatus: AccountStatus.DEACTIVATED,
          deletedAt: now
        }
      });
    }
  }

  private toResponse(request: AccountDeletionRequestWithUser, liveBlockers?: DeletionBlocker[]) {
    const storedBlockers = typeof request.blockerSummary === "object" && request.blockerSummary &&
      "blockers" in request.blockerSummary &&
      Array.isArray((request.blockerSummary as { blockers?: unknown }).blockers)
      ? (request.blockerSummary as unknown as { blockers: DeletionBlocker[] }).blockers
      : [];
    const blockers = liveBlockers ?? storedBlockers;
    return {
      id: request.id,
      requestReference: request.requestReference,
      accountType: request.accountType,
      accountTypeLabel: accountTypeLabel(request.accountType),
      status: request.status,
      reason: request.reason,
      requestedAt: request.requestedAt,
      confirmedAt: request.confirmedAt,
      processingStartedAt: request.processingStartedAt,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt,
      blockedReasonCode: request.blockedReasonCode,
      blockers,
      canCancel: cancellableStatuses.includes(request.status),
      adminNote: request.adminNote,
      adminReviewedAt: request.adminReviewedAt,
      adminReviewedBy: request.adminReviewedBy ? {
        id: request.adminReviewedBy.id,
        fullName: request.adminReviewedBy.fullName,
        adminRole: request.adminReviewedBy.adminRole
      } : null,
      user: {
        id: request.user.id,
        fullName: request.user.fullName,
        phoneNumber: request.user.phoneNumber,
        email: request.user.email,
        role: request.user.role,
        accountStatus: request.user.accountStatus,
        hasCustomerProfile: Boolean(request.user.customerProfile),
        hasCaptainProfile: Boolean(
          request.user.rider ||
          request.user.taxiDriverProfiles.length ||
          request.user.deliveryCaptainApplications.length ||
          request.user.taxiDriverApplications.length
        ),
        hasPartnerProfile: Boolean(request.user.vendor || request.user.vendorApplications.length)
      },
      operationalIndicators: {
        partnerOnline: Boolean(request.user.vendor?.isOpen),
        captainDeliveryOnline: request.user.rider?.availabilityStatus === RiderStatus.ONLINE,
        captainRideOnline: request.user.taxiDriverProfiles.some((profile) => profile.isAvailableForTaxi),
        activeWorkMode: request.user.captainWorkState?.activeWorkMode ?? null
      }
    };
  }
}
