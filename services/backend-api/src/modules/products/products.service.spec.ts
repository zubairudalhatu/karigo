import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  const product = {
    id: "product-1",
    vendorId: "vendor-1",
    name: "Chicken Suya",
    description: "Spiced grilled chicken with suya pepper.",
    category: "Grill",
    productCategory: ProductCategory.FOOD,
    price: { toNumber: () => 3000 },
    imageUrl: "https://example.com/suya.jpg",
    preparationTimeMinutes: 30,
    isAvailable: true,
    isFeatured: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    vendor: { businessName: "Kano Kitchen", businessCategory: "FOOD" }
  };
  const prisma = {
    vendor: { findFirst: jest.fn(), findUnique: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() }
  };
  const service = new ProductsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("rejects product listing for an inactive vendor", async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);
    await expect(service.listForActiveVendor("vendor-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns public products with vendor and product category metadata", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.product.findMany.mockResolvedValue([product]);
    const products = await service.listForActiveVendor("vendor-1", { productCategory: ProductCategory.FOOD });
    expect(products[0]).toMatchObject({
      vendorName: "Kano Kitchen",
      productCategory: ProductCategory.FOOD,
      serviceCategory: "FOOD",
      imageUrl: "https://example.com/suya.jpg"
    });
  });

  it("requires a vendor profile before creating products", async () => {
    prisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.createVendorProduct("user-1", {
      name: "Rice",
      description: "Clean rice bag.",
      productCategory: ProductCategory.GROCERIES,
      price: 5000,
      imageUrl: "https://example.com/rice.jpg"
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("enforces vendor ownership before update", async () => {
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.updateVendorProduct("user-1", "other-product", { name: "Blocked" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("soft archives owned products", async () => {
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.product.update.mockResolvedValue({ ...product, isAvailable: false });
    await service.archiveVendorProduct("user-1", "product-1");
    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isActive: false, isAvailable: false, deletedAt: expect.any(Date) })
    }));
  });
});
