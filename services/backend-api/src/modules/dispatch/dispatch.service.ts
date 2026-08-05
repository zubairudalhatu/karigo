import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountStatus,
  CashCollectionStatus,
  CaptainWorkLockStage,
  CaptainWorkMode,
  OrderPaymentMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  TaxiDriverProfileStatus,
  TaxiTripStatus,
  LaunchServiceType
} from "@prisma/client";
import { randomInt } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CompleteRiderJobDto } from "./dto/complete-rider-job.dto";
import { RejectRiderJobDto } from "./dto/reject-rider-job.dto";
import { UpdateRiderAvailabilityDto } from "./dto/update-rider-availability.dto";
import { UpdateRiderJobStatusDto } from "./dto/update-rider-job-status.dto";
import { UpdateRiderLocationDto } from "./dto/update-rider-location.dto";
import { DispatchEventsService } from "./dispatch-events.service";
import { DispatchStatusService } from "./dispatch-status.service";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { LaunchOperationsService } from "../launch-operations/launch-operations.service";

const CLOSED_JOB_STATUSES = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.FAILED,
  OrderStatus.REFUNDED
];

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statuses: DispatchStatusService,
    private readonly events: DispatchEventsService,
    private readonly audit: AdminAuditService,
    private readonly captainWorkState: CaptainWorkStateService,
    private readonly launchOperations: LaunchOperationsService
  ) {}

  async updateAvailability(userId: string, dto: UpdateRiderAvailabilityDto) {
    const rider = await this.requireRider(userId);
    if (dto.availability === RiderStatus.ONLINE) {
      if (
        rider.verificationStatus !== RiderStatus.ACTIVE ||
        rider.user.accountStatus !== AccountStatus.ACTIVE
      ) {
        throw new BadRequestException("Only approved active riders can go online");
      }
      const application = await this.prisma.deliveryCaptainApplication.findFirst({ where: { applicantUserId: userId }, orderBy: { createdAt: "desc" }, select: { city: true } });
      if (application) await this.launchOperations.assertControlledSupplyCanReceive({ city: application.city, serviceType: LaunchServiceType.PARCEL_DELIVERY, userId, participant: "Captain" });
    }
    if (rider.availabilityStatus === RiderStatus.BUSY) {
      throw new ConflictException("A rider with an active job cannot change availability");
    }
    await this.captainWorkState.updateAvailability(userId, { deliveryOnline: dto.availability === RiderStatus.ONLINE });
    return this.requireRider(userId);
  }

  async updateLocation(userId: string, dto: UpdateRiderLocationDto) {
    const rider = await this.requireRider(userId);
    const locationUpdateStatuses: RiderStatus[] = [RiderStatus.ONLINE, RiderStatus.BUSY];
    if (!locationUpdateStatuses.includes(rider.availabilityStatus)) {
      throw new BadRequestException("Captains can update live location only while online or on delivery");
    }
    const updated = await this.prisma.rider.update({
      where: { id: rider.id },
      data: {
        currentLatitude: new Prisma.Decimal(dto.latitude),
        currentLongitude: new Prisma.Decimal(dto.longitude),
        currentLocationUpdatedAt: new Date()
      }
    });
    await this.prisma.captainWorkState.updateMany({
      where: { userId },
      data: { lastLocationAt: updated.currentLocationUpdatedAt ?? new Date() }
    });
    return updated;
  }

  async availableRiders() {
    const riders = await this.prisma.rider.findMany({
      where: {
        availabilityStatus: RiderStatus.ONLINE,
        verificationStatus: RiderStatus.ACTIVE,
        deletedAt: null,
        user: {
          accountStatus: AccountStatus.ACTIVE,
          captainWorkState: { activeWorkMode: null, desiredDeliveryOnline: true }
        }
      },
      select: {
        id: true,
        riderCode: true,
        phoneNumber: true,
        vehicleType: true,
        availabilityStatus: true,
        currentLatitude: true,
        currentLongitude: true,
        currentLocationUpdatedAt: true,
        user: { select: { fullName: true } },
        _count: {
          select: { orders: { where: { orderStatus: { notIn: CLOSED_JOB_STATUSES } } } }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return riders.map((rider) => ({
      id: rider.id,
      riderCode: rider.riderCode,
      name: rider.user.fullName,
      phoneNumber: rider.phoneNumber,
      vehicleType: rider.vehicleType,
      availabilityStatus: rider.availabilityStatus,
      currentLatitude: rider.currentLatitude,
      currentLongitude: rider.currentLongitude,
      currentLocationUpdatedAt: rider.currentLocationUpdatedAt,
      activeJobCount: rider._count.orders
    }));
  }

  async assignRider(adminUserId: string, orderId: string, riderId: string) {
    const [order, rider] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: orderId } }),
      this.requireAvailableRider(riderId)
    ]);
    if (!order) throw new NotFoundException("Order not found");
    if (!rider.userId) throw new BadRequestException("Delivery Captain account is not linked");
    if (!order.deliveryAddressId) throw new BadRequestException("Order delivery address is not linked");
    const riderUserId = rider.userId;
    const deliveryAddress = await this.prisma.address.findUnique({ where: { id: order.deliveryAddressId }, select: { city: true, state: true } });
    await this.launchOperations.assertControlledSupplyCanReceive({ city: deliveryAddress?.city || deliveryAddress?.state || "", serviceType: LaunchServiceType.PARCEL_DELIVERY, userId: riderUserId, participant: "Captain" });
    this.statuses.assertTransition(order.orderStatus, OrderStatus.RIDER_ASSIGNED);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.captainWorkState.acquireLock(tx, {
        userId: rider.userId,
        mode: CaptainWorkMode.DELIVERY,
        workId: order.id,
        stage: CaptainWorkLockStage.OFFERED,
        actorId: adminUserId,
        reference: order.orderNumber
      });
      await tx.rider.update({
        where: { id: rider.id },
        data: { availabilityStatus: RiderStatus.BUSY }
      });
      return tx.order.update({
        where: { id: order.id },
        data: {
          riderId: rider.id,
          deliveryOtp: this.deliveryOtp(),
          orderStatus: OrderStatus.RIDER_ASSIGNED,
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: OrderStatus.RIDER_ASSIGNED,
              changedByUserId: adminUserId,
              changedByRole: "ADMIN",
              note: `Rider ${rider.riderCode} assigned`
            }
          }
        },
        include: this.adminOrderInclude()
      });
    });
    await this.events.emit("rider.assigned", updated.id, rider.id);
    await this.audit.record(adminUserId, "dispatch.rider.assigned", "Order", orderId, { riderId: rider.id });
    return updated;
  }

  async reassignRider(adminUserId: string, orderId: string, newRiderId: string) {
    const [order, newRider] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: orderId } }),
      this.requireAvailableRider(newRiderId)
    ]);
    if (!order) throw new NotFoundException("Order not found");
    if (!newRider.userId) throw new BadRequestException("Delivery Captain account is not linked");
    if (!order.deliveryAddressId) throw new BadRequestException("Order delivery address is not linked");
    const newRiderUserId = newRider.userId;
    const deliveryAddress = await this.prisma.address.findUnique({ where: { id: order.deliveryAddressId }, select: { city: true, state: true } });
    await this.launchOperations.assertControlledSupplyCanReceive({ city: deliveryAddress?.city || deliveryAddress?.state || "", serviceType: LaunchServiceType.PARCEL_DELIVERY, userId: newRiderUserId, participant: "Captain" });
    this.statuses.assertReassignable(order.orderStatus);
    if (order.riderId === newRider.id) throw new ConflictException("Rider is already assigned to this order");

    const updated = await this.prisma.$transaction(async (tx) => {
      if (order.riderId) {
        const previousRider = await tx.rider.findUnique({ where: { id: order.riderId }, select: { userId: true } });
        if (previousRider) {
          await this.captainWorkState.releaseLock(tx, {
            userId: previousRider.userId,
            mode: CaptainWorkMode.DELIVERY,
            workId: order.id,
            actorId: adminUserId
          });
        }
      }
      await this.captainWorkState.acquireLock(tx, {
        userId: newRider.userId,
        mode: CaptainWorkMode.DELIVERY,
        workId: order.id,
        stage: CaptainWorkLockStage.OFFERED,
        actorId: adminUserId,
        reference: order.orderNumber
      });
      await tx.rider.update({
        where: { id: newRider.id },
        data: { availabilityStatus: RiderStatus.BUSY }
      });
      return tx.order.update({
        where: { id: order.id },
        data: {
          riderId: newRider.id,
          orderStatus: OrderStatus.RIDER_ASSIGNED,
          deliveryOtp: order.deliveryOtp ?? this.deliveryOtp(),
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: OrderStatus.RIDER_ASSIGNED,
              changedByUserId: adminUserId,
              changedByRole: "ADMIN",
              note: `Order reassigned to rider ${newRider.riderCode}`
            }
          }
        },
        include: this.adminOrderInclude()
      });
    });
    await this.events.emit("rider.reassigned", updated.id, newRider.id);
    await this.audit.record(adminUserId, "dispatch.rider.reassigned", "Order", orderId, { riderId: newRider.id, previousRiderId: order.riderId });
    return updated;
  }

  async riderJobs(userId: string) {
    const rider = await this.requireRider(userId);
    return this.prisma.order.findMany({
      where: { riderId: rider.id },
      select: this.riderJobSelect(),
      orderBy: { updatedAt: "desc" }
    });
  }

  async riderJob(userId: string, orderId: string) {
    const rider = await this.requireRider(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, riderId: rider.id },
      select: this.riderJobSelect()
    });
    if (!order) throw new NotFoundException("Rider job not found");
    return order;
  }

  async acceptJob(userId: string, orderId: string) {
    return this.riderTransition(userId, orderId, OrderStatus.RIDER_ARRIVING_PICKUP, "Rider accepted job");
  }

  async rejectJob(userId: string, orderId: string, dto: RejectRiderJobDto) {
    const { rider, order } = await this.requireAssignedOrder(userId, orderId);
    this.statuses.assertTransition(order.orderStatus, OrderStatus.READY_FOR_PICKUP);
    const note = `Rider rejected job: ${dto.reason}${dto.details ? ` - ${dto.details}` : ""}`;
    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.order.update({
        where: { id: order.id },
        data: {
          riderId: null,
          orderStatus: OrderStatus.READY_FOR_PICKUP,
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: OrderStatus.READY_FOR_PICKUP,
              changedByUserId: userId,
              changedByRole: "RIDER",
              note
            }
          }
        }
      });
      await this.captainWorkState.releaseLock(tx, {
        userId: rider.userId,
        mode: CaptainWorkMode.DELIVERY,
        workId: order.id,
        actorId: userId
      });
      return rejected;
    });
    await this.events.emit("rider.job.rejected", updated.id, rider.id);
    return { ...updated, reassignmentRequired: true };
  }

  updateJobStatus(userId: string, orderId: string, dto: UpdateRiderJobStatusDto) {
    return this.riderTransition(userId, orderId, dto.status as OrderStatus, `Rider moved order to ${dto.status}`);
  }

  async completeJob(userId: string, orderId: string, dto: CompleteRiderJobDto) {
    const { rider, order } = await this.requireAssignedOrder(userId, orderId);
    this.statuses.assertTransition(order.orderStatus, OrderStatus.COMPLETED);
    if (!order.deliveryOtp || order.deliveryOtp !== dto.deliveryOtp) {
      throw new BadRequestException("Invalid delivery OTP");
    }
    const isCashPod = order.paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY || order.paymentStatus === PaymentStatus.CASH_PENDING;
    if (isCashPod && !dto.cashCollected) {
      throw new BadRequestException("Confirm cash collection before completing this Pay on Delivery order");
    }

    const riderPayout = order.deliveryFee;
    const completedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.riderEarning.upsert({
        where: { riderId_orderId: { riderId: rider.id, orderId: order.id } },
        update: {},
        create: {
          riderId: rider.id,
          orderId: order.id,
          deliveryFee: order.deliveryFee,
          riderPayout,
          platformDeliveryMargin: new Prisma.Decimal(0),
          payoutStatus: SettlementStatus.PENDING
        }
      });

      if (order.vendorId && order.vendor) {
        const commissionAmount = order.subtotal.mul(order.vendor.commissionRate).div(100);
        await tx.vendorSettlement.upsert({
          where: { vendorId_orderId: { vendorId: order.vendorId, orderId: order.id } },
          update: {},
          create: {
            vendorId: order.vendorId,
            orderId: order.id,
            grossAmount: order.subtotal,
            commissionRate: order.vendor.commissionRate,
            commissionAmount,
            netAmount: order.subtotal.sub(commissionAmount),
            settlementStatus: SettlementStatus.PENDING
          }
        });
      }

      await tx.rider.update({
        where: { id: rider.id },
        data: { availabilityStatus: RiderStatus.ONLINE, totalDeliveries: { increment: 1 } }
      });
      const completed = await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: OrderStatus.COMPLETED,
          completedAt,
          deliveryOtp: null,
          ...(isCashPod
            ? {
                cashCollectionStatus: CashCollectionStatus.COLLECTED,
                cashCollectedAmount: order.totalAmount,
                cashCollectedAt: completedAt,
                cashCollectedByRiderId: rider.id
              }
            : {}),
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: OrderStatus.COMPLETED,
              changedByUserId: userId,
              changedByRole: "RIDER",
              note: "Delivery OTP verified and order completed"
            }
          }
        }
      });
      await this.captainWorkState.releaseLock(tx, {
        userId: rider.userId,
        mode: CaptainWorkMode.DELIVERY,
        workId: order.id,
        actorId: userId
      });
      return completed;
    });
    await this.events.emit("order.completed", updated.id, rider.id);
    return updated;
  }

  async earnings(userId: string) {
    const [rider, rideProfile] = await Promise.all([
      this.prisma.rider.findUnique({
        where: { userId },
        include: { user: { select: { accountStatus: true } } }
      }),
      this.prisma.taxiDriverProfile.findUnique({
        where: { userId },
        select: { id: true, status: true }
      })
    ]);
    const deliveryActive = Boolean(
      rider &&
      rider.user.accountStatus === AccountStatus.ACTIVE &&
      rider.verificationStatus === RiderStatus.ACTIVE
    );
    const rideActive = Boolean(rideProfile?.status === TaxiDriverProfileStatus.ACTIVE);
    if (!deliveryActive && !rideActive) throw new NotFoundException("Captain earning profile not found");

    const [records, rideRecords] = await Promise.all([
      rider
        ? this.prisma.riderEarning.findMany({
            where: { riderId: rider.id },
            include: { order: { select: { orderNumber: true, completedAt: true } } },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve([]),
      rideProfile
        ? this.prisma.taxiTrip.findMany({
            where: { driverProfileId: rideProfile.id, status: TaxiTripStatus.COMPLETED },
            select: {
              id: true,
              tripReference: true,
              finalFareKobo: true,
              estimatedFareKobo: true,
              completedAt: true,
              createdAt: true,
              status: true
            },
            orderBy: { completedAt: "desc" }
          })
        : Promise.resolve([])
    ]);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const sum = (statuses?: SettlementStatus[]) =>
      records
        .filter((record) => !statuses || statuses.includes(record.payoutStatus))
        .reduce((total, record) => total.add(record.riderPayout), new Prisma.Decimal(0));
    const rideAmount = (fareKobo?: number | null) => new Prisma.Decimal(fareKobo ?? 0).div(100);
    const rideTotal = rideRecords.reduce((total, trip) => total.add(rideAmount(trip.finalFareKobo ?? trip.estimatedFareKobo)), new Prisma.Decimal(0));
    const recordDate = (value?: Date | null) => value ?? new Date(0);
    const deliveryToday = records.filter((record) => recordDate(record.order.completedAt ?? record.createdAt) >= startOfToday);
    const deliveryThisWeek = records.filter((record) => recordDate(record.order.completedAt ?? record.createdAt) >= startOfWeek);
    const ridesToday = rideRecords.filter((trip) => recordDate(trip.completedAt ?? trip.createdAt) >= startOfToday);
    const ridesThisWeek = rideRecords.filter((trip) => recordDate(trip.completedAt ?? trip.createdAt) >= startOfWeek);
    const sumDeliveryRecords = (items: typeof records) => items.reduce((total, record) => total.add(record.riderPayout), new Prisma.Decimal(0));
    const sumRideRecords = (items: typeof rideRecords) => items.reduce((total, trip) => total.add(rideAmount(trip.finalFareKobo ?? trip.estimatedFareKobo)), new Prisma.Decimal(0));
    return {
      totalEarnings: sum().add(rideTotal),
      todayEarnings: sumDeliveryRecords(deliveryToday).add(sumRideRecords(ridesToday)),
      thisWeekEarnings: sumDeliveryRecords(deliveryThisWeek).add(sumRideRecords(ridesThisWeek)),
      pendingEarnings: sum([SettlementStatus.PENDING, SettlementStatus.PROCESSING]),
      paidEarnings: sum([SettlementStatus.PAID]),
      completedDeliveriesCount: records.length,
      completedRidesCount: rideRecords.length,
      completedJobs: records,
      completedRides: rideRecords.map((trip) => ({
        id: trip.id,
        tripReference: trip.tripReference,
        riderPayout: rideAmount(trip.finalFareKobo ?? trip.estimatedFareKobo),
        payoutStatus: "RECORDED",
        createdAt: (trip.completedAt ?? trip.createdAt).toISOString(),
        trip: {
          tripReference: trip.tripReference,
          completedAt: trip.completedAt?.toISOString() ?? null
        }
      }))
    };
  }

  private async riderTransition(userId: string, orderId: string, nextStatus: OrderStatus, note: string) {
    const { rider, order } = await this.requireAssignedOrder(userId, orderId);
    this.statuses.assertTransition(order.orderStatus, nextStatus);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (nextStatus === OrderStatus.RIDER_ARRIVING_PICKUP) {
        await this.captainWorkState.transitionLock(tx, rider.userId, CaptainWorkMode.DELIVERY, order.id, CaptainWorkLockStage.ACCEPTED);
      }
      const inProgressDeliveryStatuses: OrderStatus[] = [OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY, OrderStatus.ARRIVED_DESTINATION, OrderStatus.DELIVERED];
      if (inProgressDeliveryStatuses.includes(nextStatus)) {
        await this.captainWorkState.transitionLock(tx, rider.userId, CaptainWorkMode.DELIVERY, order.id, CaptainWorkLockStage.IN_PROGRESS);
      }
      return tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: nextStatus,
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: nextStatus,
              changedByUserId: userId,
              changedByRole: "RIDER",
              note
            }
          }
        }
      });
    });
    await this.events.emit(this.eventFor(nextStatus), updated.id, rider.id);
    return updated;
  }

  private async requireRider(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: { user: { select: { accountStatus: true } } }
    });
    if (!rider) throw new NotFoundException("Rider profile not found");
    return rider;
  }

  private async requireAvailableRider(riderId: string) {
    const rider = await this.prisma.rider.findFirst({
      where: {
        id: riderId,
        availabilityStatus: RiderStatus.ONLINE,
        verificationStatus: RiderStatus.ACTIVE,
        deletedAt: null,
        user: {
          accountStatus: AccountStatus.ACTIVE,
          captainWorkState: { activeWorkMode: null, desiredDeliveryOnline: true }
        }
      }
    });
    if (!rider) throw new BadRequestException("Rider is not active and available");
    return rider;
  }

  private async requireAssignedOrder(userId: string, orderId: string) {
    const rider = await this.requireRider(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, riderId: rider.id },
      include: { vendor: { select: { commissionRate: true } } }
    });
    if (!order) throw new NotFoundException("Rider job not found");
    return { rider, order };
  }

  private riderJobSelect() {
    return {
      id: true,
      orderNumber: true,
      serviceCategory: true,
      orderStatus: true,
      paymentStatus: true,
      paymentMethod: true,
      cashCollectionStatus: true,
      cashCollectedAmount: true,
      cashCollectedAt: true,
      itemDescription: true,
      customerNote: true,
      deliveryFee: true,
      totalAmount: true,
      createdAt: true,
      updatedAt: true,
      vendor: { select: { businessName: true, address: true, city: true, phoneNumber: true } },
      pickupAddress: { select: { label: true, addressLine: true, city: true, state: true, deliveryNote: true } },
      deliveryAddress: { select: { label: true, addressLine: true, city: true, state: true, deliveryNote: true } },
      statusHistory: { orderBy: { createdAt: "asc" as const } }
    };
  }

  private adminOrderInclude() {
    return {
      rider: { select: { id: true, riderCode: true, phoneNumber: true, vehicleType: true } },
      statusHistory: { orderBy: { createdAt: "asc" as const } }
    };
  }

  private deliveryOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private eventFor(status: OrderStatus): string {
    const events: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.RIDER_ARRIVING_PICKUP]: "rider.job.accepted",
      [OrderStatus.PICKED_UP]: "rider.picked_up",
      [OrderStatus.ON_THE_WAY]: "rider.on_the_way",
      [OrderStatus.ARRIVED_DESTINATION]: "rider.arrived_destination",
      [OrderStatus.DELIVERED]: "rider.delivered"
    };
    return events[status] ?? "rider.job.updated";
  }
}
