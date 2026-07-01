import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

const VENDOR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PAID]: [OrderStatus.VENDOR_ACCEPTED, OrderStatus.VENDOR_REJECTED],
  [OrderStatus.VENDOR_CONFIRMING]: [OrderStatus.VENDOR_ACCEPTED, OrderStatus.VENDOR_REJECTED],
  [OrderStatus.VENDOR_ACCEPTED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP]
};

@Injectable()
export class VendorOrderStatusService {
  assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
    if (!VENDOR_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(`Order cannot move from ${currentStatus} to ${nextStatus}`);
    }
  }

  actionsFor(status: OrderStatus): string[] {
    return (VENDOR_TRANSITIONS[status] ?? []).map((nextStatus) => {
      switch (nextStatus) {
        case OrderStatus.VENDOR_ACCEPTED:
          return "accept";
        case OrderStatus.VENDOR_REJECTED:
          return "reject";
        case OrderStatus.PREPARING:
          return "preparing";
        case OrderStatus.READY_FOR_PICKUP:
          return "ready";
        default:
          return nextStatus.toLowerCase();
      }
    });
  }
}
