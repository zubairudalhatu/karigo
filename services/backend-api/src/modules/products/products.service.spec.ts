import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
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
    vendor: { businessName: "Kano Kitchen", businessCategory: "FOOD" },
    optionGroups: []
  };
  const activeVendor = { id: "vendor-1", businessCategory: "RESTAURANT" };
  const prisma = {
    vendor: { findFirst: jest.fn(), findUnique: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    vendorAuditLog: { create: jest.fn() }
  };
  const service = new ProductsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.vendorAuditLog.create.mockResolvedValue({});
  });

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

  it("accepts category alias for public category filtering", async () => {
    prisma.product.findMany.mockResolvedValue([product]);
    await service.listPublicCatalogue({ category: ProductCategory.FOOD });
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productCategory: ProductCategory.FOOD })
    }));
  });

  it("requires a vendor profile before creating products", async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);
    await expect(service.createVendorProduct("user-1", {
      name: "Rice",
      description: "Clean rice bag.",
      productCategory: ProductCategory.GROCERIES,
      price: 5000,
      imageUrl: "https://example.com/rice.jpg"
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks suspended or unapproved vendors from product self-service", async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);

    await expect(service.updateVendorProductAvailability("user-1", "product-1", {
      isAvailable: true
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("enforces vendor ownership before update", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.updateVendorProduct("user-1", "other-product", { name: "Blocked" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns not found when reading another vendor's product", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.getVendorProduct("user-1", "other-product")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("soft archives owned products", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.product.update.mockResolvedValue({ ...product, isAvailable: false });
    await service.archiveVendorProduct("user-1", "product-1");
    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isActive: false, isAvailable: false, deletedAt: expect.any(Date) })
    }));
    expect(prisma.vendorAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "vendor.product.archived", entityType: "Product", entityId: "product-1" })
    }));
  });

  it("rejects option groups with invalid selection ranges", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    await expect(service.createVendorProduct("user-1", {
      name: "Jollof Rice",
      description: "Rice with protein options.",
      productCategory: ProductCategory.FOOD,
      price: 3000,
      imageUrl: "https://example.com/rice.jpg",
      optionGroups: [{ name: "Protein", required: true, minSelections: 2, maxSelections: 1, options: [] }]
    })).rejects.toThrow("minimum selections");
  });

  it("rejects duplicate product names before creating a product", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValueOnce({ id: "duplicate-product" });

    await expect(service.createVendorProduct("user-1", {
      name: "Jollof Rice",
      description: "Rice with protein options.",
      productCategory: ProductCategory.FOOD,
      price: 3000,
      imageUrl: "https://example.com/rice.jpg"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it("rejects invalid product price, category and image media", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);

    await expect(service.createVendorProduct("user-1", {
      name: "Cheap rice",
      description: "Invalid low price.",
      productCategory: ProductCategory.FOOD,
      price: 0,
      imageUrl: "https://example.com/rice.jpg"
    })).rejects.toThrow("price");

    await expect(service.createVendorProduct("user-1", {
      name: "Bad category",
      description: "Invalid category.",
      productCategory: "PHARMACY" as ProductCategory,
      price: 2000,
      imageUrl: "https://example.com/rice.jpg"
    })).rejects.toThrow("Unsupported product category");

    await expect(service.createVendorProduct("user-1", {
      name: "Bad image",
      description: "Invalid image URL.",
      productCategory: ProductCategory.FOOD,
      price: 2000,
      imageUrl: "https://example.com/rice.pdf"
    })).rejects.toThrow("Product image");
  });

  it("creates product option groups with kobo price adjustments", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.create.mockResolvedValue(product);
    await service.createVendorProduct("user-1", {
      name: "Jollof Rice",
      description: "Rice with protein options.",
      productCategory: ProductCategory.FOOD,
      price: 3000,
      imageUrl: "https://example.com/rice.jpg",
      optionGroups: [{ name: "Protein", required: true, minSelections: 1, maxSelections: 1, options: [{ name: "Chicken", priceAdjustmentKobo: 50000 }] }]
    });
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isFeatured: false,
        optionGroups: expect.objectContaining({
          create: [expect.objectContaining({
            options: { create: [expect.objectContaining({ priceAdjustmentKobo: 50000 })] }
          })]
        })
      })
    }));
    expect(prisma.vendorAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "vendor.product.created",
        newValue: expect.objectContaining({ name: "Chicken Suya", optionGroupCount: 0 })
      })
    }));
  });

  it("updates availability with a vendor audit record", async () => {
    prisma.vendor.findFirst.mockResolvedValue(activeVendor);
    prisma.product.findFirst.mockResolvedValue(product);
    prisma.product.update.mockResolvedValue({ ...product, isAvailable: false });

    await service.updateVendorProductAvailability("user-1", "product-1", { isAvailable: false });

    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "product-1" },
      data: { isAvailable: false }
    }));
    expect(prisma.vendorAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "vendor.product.availability_updated",
        oldValue: { isAvailable: true },
        newValue: { isAvailable: false }
      })
    }));
  });
});
