import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForActiveVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, status: "ACTIVE", deletedAt: null },
      select: { id: true }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const products = await this.prisma.product.findMany({
      where: {
        vendorId,
        isAvailable: true,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: true,
        preparationTimeMinutes: true,
        isAvailable: true
      },
      orderBy: { name: "asc" }
    });

    return products.map((product) => ({
      ...product,
      imageUrl: product.imageUrl ?? "/images/product-placeholder.png"
    }));
  }
}
