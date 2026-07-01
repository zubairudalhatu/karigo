import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { DispatchStatusService } from "./dispatch-status.service";

describe("DispatchStatusService", () => {
  const service = new DispatchStatusService();

  it("allows the complete dispatch and delivery path", () => {
    const path = [
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.RIDER_ASSIGNED,
      OrderStatus.RIDER_ARRIVING_PICKUP,
      OrderStatus.PICKED_UP,
      OrderStatus.ON_THE_WAY,
      OrderStatus.ARRIVED_DESTINATION,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED
    ];
    path.slice(0, -1).forEach((status, index) => {
      expect(() => service.assertTransition(status, path[index + 1])).not.toThrow();
    });
  });

  it("prevents invalid jumps and closed-order reassignment", () => {
    expect(() => service.assertTransition(OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED))
      .toThrow(BadRequestException);
    expect(() => service.assertTransition(OrderStatus.RIDER_ASSIGNED, OrderStatus.DELIVERED))
      .toThrow(BadRequestException);
    expect(() => service.assertTransition(OrderStatus.COMPLETED, OrderStatus.ON_THE_WAY))
      .toThrow(BadRequestException);
    expect(() => service.assertReassignable(OrderStatus.REFUNDED)).toThrow(BadRequestException);
  });
});
