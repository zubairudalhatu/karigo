import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "./orders.service";
import { PromoService } from "../promos/promo.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("OrdersService", () => {
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    vendor: { findFirst: jest.fn() },
    address: { findFirst: jest.fn(), count: jest.fn() },
    product: { findMany: jest.fn() },
    order: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() }
  };
  const config = {
    get: jest.fn((key: string, fallback: number) => fallback)
  };
  const promos = { validateForCustomer: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    promos as unknown as PromoService,
    notifications as unknown as NotificationsService
  );

  beforeEach(() => jest.clearAllMocks());

  it("calculates vendor-order totals from stored product prices", async () => {
    let createData: Record<string, any> = {};
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.address.findFirst.mockResolvedValue({ id: "address-1" });
    prisma.product.findMany.mockResolvedValue([
      { id: "product-1", name: "Jollof Rice", price: new Prisma.Decimal(2500) }
    ]);
    prisma.order.create.mockImplementation(({ data }) => {
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
  });

  it("quotes a vendor order without creating it", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
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
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
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
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
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
    prisma.order.create.mockImplementation(({ data }) => data);

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
});
