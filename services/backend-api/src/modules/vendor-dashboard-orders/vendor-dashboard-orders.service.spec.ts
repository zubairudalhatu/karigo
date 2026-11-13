import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorOrderRejectionReason } from "./dto/reject-vendor-order.dto";
import { VendorDashboardOrdersService } from "./vendor-dashboard-orders.service";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";

const time = new Date("2026-11-13T10:00:00Z");
function row(orderStatus: OrderStatus = OrderStatus.PAID) {
  return { id: "order-1", vendorId: "vendor-1", orderNumber: "TEST-1", orderStatus, paymentStatus: PaymentStatus.SUCCESSFUL,
    subtotal: 100, deliveryFee: 10, serviceFee: 0, discountAmount: 0, totalAmount: 110, createdAt: time, updatedAt: time,
    customer: { user: { fullName: "Private Customer Name", phoneNumber: "+2348000001234" } }, deliveryAddress: { city: "Abuja", state: "FCT", addressLine: "PRIVATE HOME" },
    items: [], statusHistory: [{ id: "event", previousStatus: null, newStatus: "PAID", changedByRole: "ADMIN", note: "PRIVATE INTERNAL LOG", createdAt: time }],
    deliveryOtp: "SECRET OTP", payment: { gatewayResponse: "SECRET CREDENTIALS" }, customerNote: "PRIVATE DELIVERY NOTE" };
}
describe("Vendor order authorization, atomic claim and merchant projection", () => {
  let db: any, events: any, service: VendorDashboardOrdersService;
  beforeEach(() => {
    db = { $queryRaw: jest.fn(), vendor: { findFirst: jest.fn(async () => ({ id: "vendor-1" })) },
      partnerMobileSession: { findFirst: jest.fn(async () => null) }, partnerPushDelivery: { upsert: jest.fn() },
      order: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => row()), updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => row(OrderStatus.VENDOR_ACCEPTED)) },
      payment: { updateMany: jest.fn() }, orderStatusHistory: { create: jest.fn() } };
    db.$transaction = async (fn: any) => fn(db);
    events = { emit: jest.fn() };
    service = new VendorDashboardOrdersService(db as PrismaService, new VendorOrderStatusService(), events as VendorOrderEventsService);
  });
  it("requires ACTIVE owned business and scopes list to it", async () => {
    await service.list("owner", { status: OrderStatus.PAID });
    expect(db.vendor.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", status: "ACTIVE", deletedAt: null }) }));
    expect(db.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorId: "vendor-1", orderStatus: "PAID" } }));
    db.vendor.findFirst.mockResolvedValue(null); await expect(service.list("pending", {})).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("rejects a different vendor's order", async () => {
    db.order.findFirst.mockResolvedValue(null);
    await expect(service.accept("owner", "other-order")).rejects.toBeInstanceOf(NotFoundException);
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("claims state/payment/timestamp atomically before history and notifications", async () => {
    await service.accept("owner", "order-1", { expectedStatus: OrderStatus.PAID, expectedUpdatedAt: time.toISOString() });
    expect(db.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "order-1", vendorId: "vendor-1", orderStatus: "PAID", paymentStatus: "SUCCESSFUL", updatedAt: time } }));
    expect(db.orderStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: "order-1", previousStatus: "PAID", newStatus: "VENDOR_ACCEPTED", changedByUserId: "owner", changedByRole: "VENDOR" }) });
    expect(events.emit).toHaveBeenCalledTimes(1); expect(db.partnerPushDelivery.upsert).toHaveBeenCalledTimes(1);
  });
  it("a lost claim cannot set refund-review flags or create duplicate history", async () => {
    db.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.reject("owner", "order-1", { reason: VendorOrderRejectionReason.ITEM_UNAVAILABLE })).rejects.toBeInstanceOf(ConflictException);
    expect(db.payment.updateMany).not.toHaveBeenCalled(); expect(db.orderStatusHistory.create).not.toHaveBeenCalled(); expect(events.emit).not.toHaveBeenCalled();
  });
  it("a paid rejection marks review only; no payment amount or provider call", async () => {
    db.order.findUniqueOrThrow.mockResolvedValue(row(OrderStatus.VENDOR_REJECTED));
    const result = await service.reject("owner", "order-1", { reason: VendorOrderRejectionReason.ITEM_UNAVAILABLE });
    expect(result.refundReviewRequired).toBe(true);
    expect(db.payment.updateMany).toHaveBeenCalledWith({ where: { orderId: "order-1", paymentStatus: "SUCCESSFUL" }, data: { paymentStatus: "REFUND_PENDING" } });
  });
  it.each(["password=secret", "Bearer secret-token", "1234567890123456", "exception: stack trace"])("rejects non-business diagnostic/credential note %s", async details => {
    expect(() => service.reject("owner", "order-1", { reason: VendorOrderRejectionReason.OTHER, details })).toThrow(); expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it("all detail and mutation responses omit internal order/payment/customer fields", async () => {
    const result = await service.detail("owner", "order-1"); const text = JSON.stringify(result);
    for (const secret of ["SECRET OTP", "SECRET CREDENTIALS", "PRIVATE HOME", "PRIVATE INTERNAL LOG", "PRIVATE DELIVERY NOTE", "Private Customer Name", "+2348000001234"]) expect(text).not.toContain(secret);
    expect(result.customer.name).toBe("Private ****"); expect(result.customer.phoneNumber).toBe("****1234");
    expect(result).not.toHaveProperty("vendorId"); expect(result).not.toHaveProperty("deliveryOtp");
  });
  it("notification failure does not reverse or misreport a committed transition", async () => {
    events.emit.mockRejectedValue(new Error("synthetic delivery unavailable"));
    await expect(service.accept("owner", "order-1")).resolves.toMatchObject({ orderStatus: "VENDOR_ACCEPTED" });
  });
});
