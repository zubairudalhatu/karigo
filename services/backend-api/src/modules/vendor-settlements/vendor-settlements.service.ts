import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SettlementStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ListVendorSettlementsQueryDto } from "./dto/list-vendor-settlements-query.dto";

@Injectable()
export class VendorSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListVendorSettlementsQueryDto) {
    const vendor = await this.requireVendor(userId);
    const settlements = await this.prisma.vendorSettlement.findMany({
      where: {
        vendorId: vendor.id,
        ...(query.status ? { settlementStatus: query.status as SettlementStatus } : {})
      },
      select: {
        id: true,
        grossAmount: true,
        commissionRate: true,
        commissionAmount: true,
        netAmount: true,
        settlementStatus: true,
        paidAt: true,
        paymentReference: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true,
            completedAt: true,
            deliveryFee: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const items = settlements.map((settlement) => ({
      id: settlement.id,
      orderNumber: settlement.order.orderNumber,
      orderCompletedAt: settlement.order.completedAt,
      grossOrderSubtotal: settlement.grossAmount,
      deliveryFee: settlement.order.deliveryFee,
      commissionRate: settlement.commissionRate,
      platformFee: settlement.commissionAmount,
      settlementAmount: settlement.netAmount,
      settlementStatus: settlement.settlementStatus,
      paidAt: settlement.paidAt,
      payoutReference: settlement.paymentReference,
      createdAt: settlement.createdAt
    }));

    return {
      summary: {
        totalSettlements: items.length,
        pendingPayout: this.sum(items.filter((item) => item.settlementStatus === SettlementStatus.PENDING).map((item) => item.settlementAmount)),
        paidOut: this.sum(items.filter((item) => item.settlementStatus === SettlementStatus.PAID).map((item) => item.settlementAmount))
      },
      items
    };
  }

  private async requireVendor(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return vendor;
  }

  private sum(values: Array<Prisma.Decimal | number | string>) {
    let total = new Prisma.Decimal(0);
    for (const value of values) {
      total = total.add(value);
    }
    return total;
  }
}
