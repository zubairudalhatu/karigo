import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { ProductInputDto } from "./dto/product-input.dto";
import { UpdateProductAvailabilityDto } from "./dto/update-product-availability.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

const PRODUCT_SELECT = {
  id: true,
  vendorId: true,
  name: true,
  description: true,
  category: true,
  productCategory: true,
  price: true,
  imageUrl: true,
  preparationTimeMinutes: true,
  isAvailable: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  vendor: { select: { businessName: true, businessCategory: true } }
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForActiveVendor(vendorId: string, query: ListProductsQueryDto = {}) {
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
        deletedAt: null,
        ...this.publicFilters(query)
      },
      select: PRODUCT_SELECT,
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }]
    });

    return products.map((product) => this.toProductSummary(product));
  }

  async listPublicCatalogue(query: ListProductsQueryDto = {}) {
    const products = await this.prisma.product.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        deletedAt: null,
        vendor: { status: "ACTIVE", deletedAt: null },
        ...this.publicFilters(query)
      },
      select: PRODUCT_SELECT,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
      take: 60
    });

    return products.map((product) => this.toProductSummary(product));
  }

  async listVendorProducts(userId: string, query: ListProductsQueryDto = {}) {
    const vendor = await this.requireVendor(userId);
    const products = await this.prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        deletedAt: null,
        isActive: true,
        ...this.publicFilters(query)
      },
      select: PRODUCT_SELECT,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
    });

    return products.map((product) => this.toProductSummary(product));
  }

  async createVendorProduct(userId: string, dto: ProductInputDto) {
    const vendor = await this.requireVendor(userId);
    const product = await this.prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: dto.name,
        description: dto.description,
        category: dto.category ?? this.labelForCategory(dto.productCategory),
        productCategory: dto.productCategory,
        price: new Prisma.Decimal(dto.price),
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
        isFeatured: dto.isFeatured ?? false
      },
      select: PRODUCT_SELECT
    });

    return this.toProductSummary(product);
  }

  async getVendorProduct(userId: string, productId: string) {
    const product = await this.requireOwnedProduct(userId, productId);
    return this.toProductSummary(product);
  }

  async updateVendorProduct(userId: string, productId: string, dto: UpdateProductDto) {
    await this.requireOwnedProduct(userId, productId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.productCategory !== undefined ? { productCategory: dto.productCategory } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {})
      },
      select: PRODUCT_SELECT
    });

    return this.toProductSummary(product);
  }

  async updateVendorProductAvailability(userId: string, productId: string, dto: UpdateProductAvailabilityDto) {
    await this.requireOwnedProduct(userId, productId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isAvailable: dto.isAvailable },
      select: PRODUCT_SELECT
    });

    return this.toProductSummary(product);
  }

  async archiveVendorProduct(userId: string, productId: string) {
    await this.requireOwnedProduct(userId, productId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false, isAvailable: false, deletedAt: new Date() },
      select: PRODUCT_SELECT
    });

    return this.toProductSummary(product);
  }

  private publicFilters(query: ListProductsQueryDto) {
    return {
      ...(query.productCategory ? { productCategory: query.productCategory } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
              { category: { contains: query.search, mode: "insensitive" as const } },
              { vendor: { businessName: { contains: query.search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };
  }

  private async requireVendor(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId }, select: { id: true } });
    if (!vendor) {
      throw new ForbiddenException("Vendor profile is required");
    }
    return vendor;
  }

  private async requireOwnedProduct(userId: string, productId: string) {
    const vendor = await this.requireVendor(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id, deletedAt: null, isActive: true },
      select: PRODUCT_SELECT
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  private toProductSummary(product: Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>) {
    return {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendor.businessName,
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? this.labelForCategory(product.productCategory),
      productCategory: product.productCategory,
      serviceCategory: this.serviceCategoryForProduct(product.productCategory),
      price: product.price.toNumber(),
      imageUrl: product.imageUrl ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      preparationTimeMinutes: product.preparationTimeMinutes,
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    };
  }

  private serviceCategoryForProduct(category: ProductCategory) {
    return category === ProductCategory.FOOD ? "FOOD" : category === ProductCategory.GROCERIES ? "GROCERY" : "MARKET";
  }

  private labelForCategory(category: ProductCategory) {
    return category === ProductCategory.FOOD ? "Food" : category === ProductCategory.GROCERIES ? "Groceries" : "Market Items";
  }
}
