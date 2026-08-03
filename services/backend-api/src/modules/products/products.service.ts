import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, Prisma, ProductCategory, VendorStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { resolvePartnerCapabilities } from "../vendors/partner-capabilities";
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

type SelectedProduct = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;
const PRODUCT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

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
    const vendor = await this.requireActiveProductVendor(userId);
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
    const vendor = await this.requireActiveProductVendor(userId);
    const input = await this.validatedInput(vendor.id, dto) as ProductInputDto;
    const product = await this.prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: input.name,
        description: input.description,
        category: input.category ?? this.labelForCategory(input.productCategory),
        productCategory: input.productCategory,
        price: new Prisma.Decimal(input.price),
        imageUrl: input.imageUrl,
        isAvailable: input.isAvailable ?? true,
        isFeatured: false,
        optionGroups: this.optionGroupsCreate(input.optionGroups)
      },
      select: PRODUCT_SELECT
    }) as SelectedProduct;
    await this.logProductAudit(vendor.id, userId, "vendor.product.created", product.id, null, this.auditSnapshot(product));

    return this.toProductSummary(product);
  }

  async getVendorProduct(userId: string, productId: string) {
    const product = await this.requireOwnedProduct(userId, productId);
    return this.toProductSummary(product);
  }

  async updateVendorProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const existing = await this.requireOwnedProduct(userId, productId);
    const input = await this.validatedInput(existing.vendorId, dto, productId);
    const productData: Prisma.ProductUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.productCategory !== undefined ? { productCategory: input.productCategory } : {}),
      ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
      ...(input.optionGroups !== undefined ? {
        optionGroups: { create: this.optionGroupsCreate(input.optionGroups)?.create ?? [] }
      } : {})
    };

    const product = input.optionGroups !== undefined
      ? await this.prisma.$transaction(async (tx) => {
          await tx.productOptionGroup.updateMany({ where: { productId }, data: { isActive: false } });
          return tx.product.update({ where: { id: productId }, data: productData, select: PRODUCT_SELECT });
        })
      : await this.prisma.product.update({
          where: { id: productId },
          data: productData,
          select: PRODUCT_SELECT
        });
    await this.logProductAudit(existing.vendorId, userId, "vendor.product.updated", product.id, this.auditSnapshot(existing), {
      ...this.auditSnapshot(product),
      changedFields: this.changedFields(existing, input)
    });

    return this.toProductSummary(product);
  }

  async updateVendorProductAvailability(userId: string, productId: string, dto: UpdateProductAvailabilityDto) {
    const existing = await this.requireOwnedProduct(userId, productId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isAvailable: dto.isAvailable },
      select: PRODUCT_SELECT
    });
    await this.logProductAudit(existing.vendorId, userId, "vendor.product.availability_updated", product.id, {
      isAvailable: existing.isAvailable
    }, {
      isAvailable: product.isAvailable
    });

    return this.toProductSummary(product);
  }

  async archiveVendorProduct(userId: string, productId: string) {
    const existing = await this.requireOwnedProduct(userId, productId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false, isAvailable: false, deletedAt: new Date() },
      select: PRODUCT_SELECT
    });
    await this.logProductAudit(existing.vendorId, userId, "vendor.product.archived", product.id, this.auditSnapshot(existing), {
      isActive: false,
      isAvailable: product.isAvailable
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

  private async requireActiveProductVendor(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: VendorStatus.ACTIVE,
        user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
      },
      select: {
        id: true,
        businessCategory: true,
        status: true,
        deletedAt: true,
        sourceApplication: {
          select: {
            businessCategory: true,
            businessType: true,
            catalogueCategory: true,
            status: true
          }
        },
        user: {
          select: {
            accountStatus: true,
            deletedAt: true
          }
        }
      }
    });
    if (!vendor) {
      throw new ForbiddenException("Active approved Partner account is required to manage products.");
    }
    const capabilities = resolvePartnerCapabilities(vendor);
    if (!capabilities.canAccessWorkspace) {
      throw new ForbiddenException(capabilities.message);
    }
    if (!capabilities.canManageProducts) {
      throw new BadRequestException("Product Seller or mixed Partner capability is required to manage products.");
    }
    return vendor;
  }

  private async requireOwnedProduct(userId: string, productId: string) {
    const vendor = await this.requireActiveProductVendor(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id, deletedAt: null, isActive: true },
      select: PRODUCT_SELECT
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  private async validatedInput(vendorId: string, dto: Partial<ProductInputDto>, existingProductId?: string) {
    const input = { ...dto };
    if (input.name !== undefined) {
      input.name = this.requiredText(input.name, "Product name", 2, 120);
      await this.assertUniqueProductName(vendorId, input.name, existingProductId);
    }
    if (input.description !== undefined) {
      input.description = this.requiredText(input.description, "Product description", 8, 280);
    }
    if (input.category !== undefined) {
      input.category = input.category?.trim() ? this.requiredText(input.category, "Display category", 1, 80) : undefined;
    }
    if (input.productCategory !== undefined && !Object.values(ProductCategory).includes(input.productCategory)) {
      throw new BadRequestException("Unsupported product category.");
    }
    if (input.price !== undefined && (!Number.isFinite(Number(input.price)) || Number(input.price) < 1)) {
      throw new BadRequestException("Product price must be at least NGN 1.");
    }
    if (input.imageUrl !== undefined) {
      input.imageUrl = this.validImageUrl(input.imageUrl);
    }
    if (input.isFeatured !== undefined) {
      delete input.isFeatured;
    }
    return input;
  }

  private async assertUniqueProductName(vendorId: string, name: string, existingProductId?: string) {
    const duplicate = await this.prisma.product.findFirst({
      where: {
        vendorId,
        deletedAt: null,
        isActive: true,
        name: { equals: name, mode: "insensitive" },
        ...(existingProductId ? { id: { not: existingProductId } } : {})
      },
      select: { id: true }
    });
    if (duplicate) {
      throw new BadRequestException("A product with this name already exists in your catalogue.");
    }
  }

  private requiredText(value: unknown, label: string, minLength: number, maxLength: number) {
    const text = String(value ?? "").trim();
    if (text.length < minLength) throw new BadRequestException(`${label} is too short.`);
    if (text.length > maxLength) throw new BadRequestException(`${label} is too long.`);
    return text;
  }

  private validImageUrl(value: unknown) {
    const raw = String(value ?? "").trim();
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:") throw new Error("invalid protocol");
      const path = parsed.pathname.toLowerCase();
      const isKnownUpload = path.includes("/uploads/vendors/") && path.includes("/product-images/");
      const hasImageExtension = PRODUCT_IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension));
      if (!isKnownUpload && !hasImageExtension) {
        throw new Error("unsupported image type");
      }
      return raw;
    } catch {
      throw new BadRequestException("Product image must be a valid HTTPS JPG, PNG or WebP URL.");
    }
  }

  private toProductSummary(product: SelectedProduct) {
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

  private auditSnapshot(product: SelectedProduct) {
    return {
      name: product.name,
      category: product.category,
      productCategory: product.productCategory,
      price: product.price.toNumber(),
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured,
      imageUrlPresent: Boolean(product.imageUrl),
      optionGroupCount: product.optionGroups.length
    };
  }

  private changedFields(existing: SelectedProduct, input: Partial<ProductInputDto>) {
    const fields: string[] = [];
    if (input.name !== undefined && input.name !== existing.name) fields.push("name");
    if (input.description !== undefined && input.description !== existing.description) fields.push("description");
    if (input.category !== undefined && input.category !== existing.category) fields.push("category");
    if (input.productCategory !== undefined && input.productCategory !== existing.productCategory) fields.push("productCategory");
    if (input.price !== undefined && Number(input.price) !== existing.price.toNumber()) fields.push("price");
    if (input.imageUrl !== undefined && input.imageUrl !== existing.imageUrl) fields.push("imageUrl");
    if (input.isAvailable !== undefined && input.isAvailable !== existing.isAvailable) fields.push("isAvailable");
    if (input.optionGroups !== undefined) fields.push("optionGroups");
    return fields;
  }

  private async logProductAudit(vendorId: string, actorUserId: string, action: string, productId: string, oldValue: object | null, newValue: object) {
    await this.prisma.vendorAuditLog.create({
      data: {
        vendorId,
        actorUserId,
        action,
        entityType: "Product",
        entityId: productId,
        oldValue: oldValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue
      }
    });
  }
}
