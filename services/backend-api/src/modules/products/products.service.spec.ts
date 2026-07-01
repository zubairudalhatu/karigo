import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  const prisma = {
    vendor: { findFirst: jest.fn() },
    product: { findMany: jest.fn() }
  };
  const service = new ProductsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("rejects product listing for an inactive vendor", async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);
    await expect(service.listForActiveVendor("vendor-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("adds a placeholder when a product has no image", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-1" });
    prisma.product.findMany.mockResolvedValue([{ id: "product-1", imageUrl: null }]);
    const products = await service.listForActiveVendor("vendor-1");
    expect(products[0].imageUrl).toBe("/images/product-placeholder.png");
  });
});
