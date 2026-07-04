import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
  vendor: { select: { businessName: true, businessCategory: true } },
  optionGroups: {
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      required: true,
      minSelections: true,
      maxSelections: true,
      displayOrder: true,
      options: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          priceAdjustmentKobo: true,
          available: true,
          displayOrder: true
        }
      }
    }
  }
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
        isFeatured: dto.isFeatured ?? false,
        optionGroups: this.optionGroupsCreate(dto.optionGroups)
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
    const productData: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.productCategory !== undefined ? { productCategory: dto.productCategory } : {}),
      ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      ...(dto.optionGroups !== undefined ? {
        optionGroups: { create: this.optionGroupsCreate(dto.optionGroups)?.create ?? [] }
      } : {})
    };

    const product = dto.optionGroups !== undefined
      ? await this.prisma.$transaction(async (tx) => {
          await tx.productOptionGroup.updateMany({ where: { productId }, data: { isActive: false } });
          return tx.product.update({ where: { id: productId }, data: productData, select: PRODUCT_SELECT });
        })
      : await this.prisma.product.update({
          where: { id: productId },
          data: productData,
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
    const productCategory = query.category ?? query.productCategory;
    return {
      ...(productCategory ? { productCategory } : {}),
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
      optionGroups: product.optionGroups.map((group) => ({
        id: group.id,
        name: group.name,
        required: group.required,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        displayOrder: group.displayOrder,
        options: group.options.map((option) => ({
          id: option.id,
          name: option.name,
          priceAdjustmentKobo: option.priceAdjustmentKobo,
          available: option.available,
          displayOrder: option.displayOrder
        }))
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    };
  }

  private optionGroupsCreate(groups: ProductInputDto["optionGroups"]) {
    if (!groups?.length) return undefined;
    groups.forEach((group) => {
      const minSelections = group.minSelections ?? (group.required ? 1 : 0);
      const maxSelections = group.maxSelections ?? Math.max(1, minSelections);
      if (minSelections > maxSelections) {
        throw new BadRequestException("Option group minimum selections cannot exceed maximum selections");
      }
    });

    return {
      create: groups.map((group, groupIndex) => {
        const minSelections = group.minSelections ?? (group.required ? 1 : 0);
        const maxSelections = group.maxSelections ?? Math.max(1, minSelections);
        return {
          name: group.name,
          required: group.required ?? false,
          minSelections,
          maxSelections,
          displayOrder: group.displayOrder ?? groupIndex,
          options: {
            create: (group.options ?? []).map((option, optionIndex) => ({
              name: option.name,
              priceAdjustmentKobo: option.priceAdjustmentKobo,
              available: option.available ?? true,
              displayOrder: option.displayOrder ?? optionIndex
            }))
          }
        };
      })
    };
  }

  private serviceCategoryForProduct(category: ProductCategory) {
    return category === ProductCategory.FOOD ? "FOOD" : category === ProductCategory.GROCERIES ? "GROCERY" : "MARKET";
  }

  private labelForCategory(category: ProductCategory) {
    return category === ProductCategory.FOOD ? "Food" : category === ProductCategory.GROCERIES ? "Groceries" : "Market Items";
  }
}
