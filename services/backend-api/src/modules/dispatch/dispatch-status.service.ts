import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

const DELIVERY_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.RIDER_ASSIGNED],
  [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.RIDER_ARRIVING_PICKUP, OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.RIDER_ARRIVING_PICKUP]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.ON_THE_WAY],
  [OrderStatus.ON_THE_WAY]: [OrderStatus.ARRIVED_DESTINATION],
  [OrderStatus.ARRIVED_DESTINATION]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED]
};

@Injectable()
export class DispatchStatusService {
  assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
    if (!DELIVERY_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(`Order cannot move from ${currentStatus} to ${nextStatus}`);
    }
  }

  assertReassignable(status: OrderStatus): void {
    const closed = new Set<OrderStatus>([
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
      OrderStatus.REFUND_REQUESTED,
      OrderStatus.REFUNDED
    ]);
    if (closed.has(status)) {
      throw new BadRequestException(`Order in ${status} status cannot be reassigned`);
    }
  }
}
