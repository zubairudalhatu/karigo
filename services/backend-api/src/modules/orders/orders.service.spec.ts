import { ConfigService } from "@nestjs/config";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CashCollectionStatus, OrderPaymentMethod, OrderStatus, PaymentStatus, Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "./orders.service";
import { PromoService } from "../promos/promo.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";

describe("OrdersService", () => {
  const validDeliveryOtp = ["1", "2", "3", "4", "5", "6"].join("");
  const prisma: any = {
    customerProfile: { findUnique: jest.fn() },
    vendor: { findFirst: jest.fn() },
    address: { findFirst: jest.fn(), count: jest.fn() },
    product: { findMany: jest.fn() },
    order: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() }
  };
  prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => unknown) => callback(prisma));
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => fallback)
  };
  const promos = { validateForCustomer: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const applicationNotifications = { orderCreated: jest.fn() };
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    promos as unknown as PromoService,
    notifications as unknown as NotificationsService,
    applicationNotifications as unknown as ApplicationNotificationsService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((_: string, fallback?: unknown) => fallback);
    applicationNotifications.orderCreated.mockResolvedValue(undefined);
  });

  it("calculates vendor-order totals from stored product prices", async () => {
    let createData: Record<string, any> = {};
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.address.findFirst.mockResolvedValue({ id: "address-1" });
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", name: "Jollof Rice", price: new Prisma.Decimal(2500) }
    ]);
    prisma.order.create.mockImplementation(({ data }: { data: Record<string, any> }) => {
      createData = data;
      return data;
    });

    const result = await service.createVendorOrder("user-1", {
      vendorId: "vendor-1",
      deliveryAddressId: "address-1",
      serviceCategory: ServiceCategory.FOOD,
      items: [{ productId: "product-1", quantity: 2 }]
    });

    expect(result.orderStatus).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(result.subtotal.toNumber()).toBe(5000);
    expect(result.deliveryFee.toNumber()).toBe(1000);
    expect(result.totalAmount.toNumber()).toBe(6000);
    expect(createData.items.create[0]).toEqual(expect.objectContaining({
      productName: "Jollof Rice",
      quantity: 2
    }));
    expect(applicationNotifications.orderCreated).toHaveBeenCalledWith(expect.objectContaining({
      reference: result.orderNumber,
      recipientName: "Demo Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test"
    }));
  });

  it("quotes a vendor order without creating it", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.address.findFirst.mockResolvedValue({ id: "address-1" });
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", name: "Chicken Suya", price: new Prisma.Decimal(2500) }
    ]);

    const result = await service.quoteVendorOrder("user-1", {
      vendorId: "vendor-1",
      deliveryAddressId: "address-1",
      serviceCategory: ServiceCategory.FOOD,
      items: [{ productId: "product-1", quantity: 1 }]
    });

    expect(result.quoteReference).toMatch(/^KGO-QUOTE-/);
    expect(result.cartSubtotal.toNumber()).toBe(2500);
    expect(result.deliveryFee.toNumber()).toBe(1000);
    expect(result.discountAmount.toNumber()).toBe(0);
    expect(result.finalPayableAmount.toNumber()).toBe(3500);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects a parcel request using an address the customer does not own", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.address.count.mockResolvedValue(1);

    await expect(service.createParcelOrder("user-1", {
      pickupAddressId: "address-1",
      deliveryAddressId: "address-2",
      recipientName: "Recipient",
      recipientPhone: "+2348012345678",
      itemDescription: "Documents"
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("applies a server-validated promo discount to a vendor order", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.address.findFirst.mockResolvedValue({ id: "address-1" });
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", name: "Jollof Rice", price: new Prisma.Decimal(5000) }
    ]);
    promos.validateForCustomer.mockResolvedValue({
      promo: { id: "promo-1" },
      discountAmount: new Prisma.Decimal(500),
      finalPayableAmount: new Prisma.Decimal(5500)
    });
    prisma.order.create.mockImplementation(({ data }: { data: Record<string, any> }) => data);

    const result = await service.createVendorOrder("user-1", {
      vendorId: "vendor-1",
      deliveryAddressId: "address-1",
      serviceCategory: ServiceCategory.FOOD,
      promoCode: "KARIGOFIRST",
      items: [{ productId: "product-1", quantity: 1 }]
    });

    expect(result.promoCodeId).toBe("promo-1");
    expect(result.discountAmount.toNumber()).toBe(500);
    expect(result.totalAmount.toNumber()).toBe(5500);
  });

  it("creates a Pay on Delivery order without starting electronic payment", async () => {
    let createData: Record<string, any> = {};
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.address.findFirst.mockResolvedValue({ id: "address-1", city: "Kano" });
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", name: "Jollof Rice", price: new Prisma.Decimal(2500) }
    ]);
    config.get.mockImplementation((key: string, fallback: unknown) => key === "CASH_ON_DELIVERY_ENABLED" ? "true" : fallback);
    prisma.order.create.mockImplementation(({ data }: { data: Record<string, any> }) => {
      createData = data;
      return data;
    });

    const result = await service.createVendorOrder("user-1", {
      vendorId: "vendor-1",
      deliveryAddressId: "address-1",
      serviceCategory: ServiceCategory.FOOD,
      paymentMethod: "CASH_ON_DELIVERY",
      items: [{ productId: "product-1", quantity: 1 }]
    });

    expect(result.paymentMethod).toBe(OrderPaymentMethod.CASH_ON_DELIVERY);
    expect(result.paymentStatus).toBe(PaymentStatus.CASH_PENDING);
    expect(result.orderStatus).toBe(OrderStatus.PAID);
    expect(result.cashCollectionStatus).toBe(CashCollectionStatus.PENDING_COLLECTION);
    expect(createData.statusHistory.create.note).toContain("cash collection is pending");
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: "Order created",
      message: expect.stringContaining("Pay on Delivery")
    }));
  });

  it("returns delivery OTP only for an owned arrived or delivered order", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-1",
      orderStatus: OrderStatus.ARRIVED_DESTINATION,
      deliveryOtp: validDeliveryOtp
    });

    const result = await service.deliveryOtp("user-1", "order-1");

    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: "order-1", customerId: "customer-1" },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        deliveryOtp: true
      }
    });
    expect(result).toEqual({
      orderId: "order-1",
      orderNumber: "KGO-1",
      deliveryOtp: validDeliveryOtp
    });
  });

  it("does not return delivery OTP for another customer's order", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(service.deliveryOtp("user-1", "order-2")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("hides delivery OTP before rider arrival", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-1",
      orderStatus: OrderStatus.ON_THE_WAY,
      deliveryOtp: validDeliveryOtp
    });

    await expect(service.deliveryOtp("user-1", "order-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("hides delivery OTP after completion or when it has been cleared", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      orderNumber: "KGO-1",
      orderStatus: OrderStatus.COMPLETED,
      deliveryOtp: null
    });

    await expect(service.deliveryOtp("user-1", "order-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("sends a controlled transactional notification for parcel order creation", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1", user: { fullName: "Demo Customer", phoneNumber: "+2348030000000", email: "customer@example.test" } });
    prisma.address.count.mockResolvedValue(2);
    prisma.order.create.mockImplementation(({ data }: { data: Record<string, any> }) => ({ ...data, id: "order-1", orderNumber: "KGO-PARCEL-1" }));

    const result = await service.createParcelOrder("user-1", {
      pickupAddressId: "address-1",
      deliveryAddressId: "address-2",
      recipientName: "Recipient",
      recipientPhone: "+2348012345678",
      itemDescription: "Documents"
    });

    expect(applicationNotifications.orderCreated).toHaveBeenCalledWith({
      reference: result.orderNumber,
      recipientName: "Demo Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test"
    });
  });
});
