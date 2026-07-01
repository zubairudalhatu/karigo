import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, SettlementStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ListSettlementsQueryDto } from "./dto/list-settlements-query.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService, private readonly notifications: NotificationsService) {}

  vendorSettlements(query: ListSettlementsQueryDto) {
    return this.prisma.vendorSettlement.findMany({
      where: query.status ? { settlementStatus: query.status } : {},
      include: { vendor: { select: { id: true, businessName: true, bankName: true, accountName: true } }, order: { select: { orderNumber: true, completedAt: true } } },
      orderBy: { createdAt: "desc" }
    });
  }
  async vendorSettlement(id: string) {
    const settlement = await this.prisma.vendorSettlement.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, businessName: true, bankName: true, accountName: true, accountNumber: true } }, order: { select: { orderNumber: true, completedAt: true } } }
    });
    if (!settlement) throw new NotFoundException("Vendor settlement not found");
    return settlement;
  }
  async markVendorPaid(adminUserId: string, id: string) {
    const settlement = await this.vendorSettlement(id);
    if (settlement.settlementStatus === SettlementStatus.PAID) return settlement;
    if (!([SettlementStatus.PENDING, SettlementStatus.PROCESSING] as SettlementStatus[]).includes(settlement.settlementStatus)) {
      throw new BadRequestException("Vendor settlement cannot be marked paid");
    }
    const updated = await this.prisma.vendorSettlement.update({ where: { id }, data: { settlementStatus: SettlementStatus.PAID, paidAt: new Date() } });
    await this.audit.record(adminUserId, "settlement.vendor.marked_paid", "VendorSettlement", id, { vendorId: settlement.vendorId, orderId: settlement.orderId });
    const vendor = await this.prisma.vendor.findUnique({ where: { id: settlement.vendorId }, select: { userId: true } });
    if (vendor) await this.notifications.createNotification({ userId: vendor.userId, title: "Settlement paid", message: `Settlement for order ${settlement.order.orderNumber} was marked paid.`, type: NotificationType.SETTLEMENT_PAID, entityType: "VendorSettlement", entityId: id });
    return updated;
  }

  riderEarnings(query: ListSettlementsQueryDto) {
    return this.prisma.riderEarning.findMany({
      where: query.status ? { payoutStatus: query.status } : {},
      include: { rider: { select: { id: true, riderCode: true, user: { select: { fullName: true } } } }, order: { select: { orderNumber: true, completedAt: true } } },
      orderBy: { createdAt: "desc" }
    });
  }
  async riderEarning(id: string) {
    const earning = await this.prisma.riderEarning.findUnique({
      where: { id },
      include: { rider: { select: { id: true, riderCode: true, phoneNumber: true, user: { select: { fullName: true } } } }, order: { select: { orderNumber: true, completedAt: true } } }
    });
    if (!earning) throw new NotFoundException("Rider earning not found");
    return earning;
  }
  async markRiderPaid(adminUserId: string, id: string) {
    const earning = await this.riderEarning(id);
    if (earning.payoutStatus === SettlementStatus.PAID) return earning;
    if (!([SettlementStatus.PENDING, SettlementStatus.PROCESSING] as SettlementStatus[]).includes(earning.payoutStatus)) {
      throw new BadRequestException("Rider earning cannot be marked paid");
    }
    const updated = await this.prisma.riderEarning.update({ where: { id }, data: { payoutStatus: SettlementStatus.PAID, paidAt: new Date() } });
    await this.audit.record(adminUserId, "settlement.rider.marked_paid", "RiderEarning", id, { riderId: earning.riderId, orderId: earning.orderId });
    const rider = await this.prisma.rider.findUnique({ where: { id: earning.riderId }, select: { userId: true } });
    if (rider) await this.notifications.createNotification({ userId: rider.userId, title: "Rider earning paid", message: `Earning for order ${earning.order.orderNumber} was marked paid.`, type: NotificationType.RIDER_EARNING_PAID, entityType: "RiderEarning", entityId: id });
    return updated;
  }
}
