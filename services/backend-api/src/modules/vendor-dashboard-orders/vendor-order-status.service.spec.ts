import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { VendorOrderStatusService } from "./vendor-order-status.service";

describe("VendorOrderStatusService", () => {
  const service = new VendorOrderStatusService();

  it("allows the vendor fulfilment path", () => {
    expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.VENDOR_ACCEPTED)).not.toThrow();
    expect(() => service.assertTransition(OrderStatus.VENDOR_ACCEPTED, OrderStatus.PREPARING)).not.toThrow();
    expect(() => service.assertTransition(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP)).not.toThrow();
  });

  it("allows rejection only from paid or confirming", () => {
    expect(() => service.assertTransition(OrderStatus.VENDOR_CONFIRMING, OrderStatus.VENDOR_REJECTED)).not.toThrow();
    expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.VENDOR_REJECTED)).not.toThrow();
    expect(() => service.assertTransition(OrderStatus.COMPLETED, OrderStatus.VENDOR_REJECTED))
      .toThrow(BadRequestException);
  });

  it("prevents backward and invalid transitions", () => {
    expect(() => service.assertTransition(OrderStatus.PREPARING, OrderStatus.VENDOR_ACCEPTED))
      .toThrow(BadRequestException);
    expect(() => service.assertTransition(OrderStatus.READY_FOR_PICKUP, OrderStatus.PREPARING))
      .toThrow(BadRequestException);
    expect(() => service.assertTransition(OrderStatus.CANCELLED, OrderStatus.VENDOR_ACCEPTED))
      .toThrow(BadRequestException);
    expect(() => service.assertTransition(OrderStatus.REFUNDED, OrderStatus.PREPARING))
      .toThrow(BadRequestException);
  });
});
