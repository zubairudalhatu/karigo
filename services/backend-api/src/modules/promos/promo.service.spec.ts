import { BadRequestException } from "@nestjs/common";
import { Prisma, PromoDiscountType, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PromoService } from "./promo.service";

describe("PromoService", () => {
  const prisma = {
    promoCode: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    promoCodeUsage: { count: jest.fn() },
    order: { count: jest.fn(), findFirst: jest.fn() },
    customerProfile: { findUnique: jest.fn() }
  };
  const audit = { record: jest.fn() };
  const service = new PromoService(prisma as unknown as PrismaService, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it("calculates a capped percentage discount", async () => {
    prisma.promoCode.findUnique.mockResolvedValue({
      id: "promo-1", code: "KARIGOFIRST", isActive: true,
      startsAt: new Date("2025-01-01"), endsAt: new Date("2030-01-01"),
      usageLimit: null, usageCount: 0, usageLimitPerCustomer: 1, firstOrderOnly: true,
      minimumOrderAmount: new Prisma.Decimal(2000), vendorId: null, serviceCategory: null,
      discountType: PromoDiscountType.PERCENTAGE, discountValue: new Prisma.Decimal(10),
      maxDiscountAmount: new Prisma.Decimal(1000)
    });
    prisma.promoCodeUsage.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    const result = await service.validateForCustomer("customer-1", "karigofirst", {
      subtotal: new Prisma.Decimal(15000),
      deliveryFee: new Prisma.Decimal(1000),
      serviceCategory: ServiceCategory.FOOD
    });
    expect(result.discountAmount.toNumber()).toBe(1000);
    expect(result.finalPayableAmount.toNumber()).toBe(15000);
  });

  it("rejects vendor-restricted promos for another vendor", async () => {
    prisma.promoCode.findUnique.mockResolvedValue({
      id: "promo-1", isActive: true, startsAt: new Date("2025-01-01"), endsAt: new Date("2030-01-01"),
      usageLimit: null, usageCount: 0, minimumOrderAmount: new Prisma.Decimal(0),
      vendorId: "vendor-1", serviceCategory: null
    });
    await expect(service.validateForCustomer("customer-1", "VENDORONLY", {
      subtotal: new Prisma.Decimal(5000), deliveryFee: new Prisma.Decimal(1000), vendorId: "vendor-2"
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("never lets a fixed discount exceed subtotal", async () => {
    prisma.promoCode.findUnique.mockResolvedValue({
      id: "promo-1", isActive: true, startsAt: new Date("2025-01-01"), endsAt: new Date("2030-01-01"),
      usageLimit: null, usageCount: 0, usageLimitPerCustomer: null, firstOrderOnly: false,
      minimumOrderAmount: new Prisma.Decimal(0), vendorId: null, serviceCategory: null,
      discountType: PromoDiscountType.FIXED_AMOUNT, discountValue: new Prisma.Decimal(9000), maxDiscountAmount: null
    });
    prisma.promoCodeUsage.count.mockResolvedValue(0);
    const result = await service.validateForCustomer("customer-1", "FIXED", {
      subtotal: new Prisma.Decimal(5000), deliveryFee: new Prisma.Decimal(1000)
    });
    expect(result.discountAmount.toNumber()).toBe(5000);
    expect(result.finalPayableAmount.toNumber()).toBe(1000);
  });
});
