import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductCategory, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: { select: publicUserSelect },
        category: true
      }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }

    return vendor;
  }

  async update(userId: string, dto: UpdateVendorProfileDto) {
    await this.me(userId);
    return this.prisma.vendor.update({
      where: { userId },
      data: dto,
      include: {
        user: { select: publicUserSelect },
        category: true
      }
    });
  }

  async listPublic(query: ListVendorsQueryDto) {
    const productCategory = query.serviceCategory ? this.productCategoryForService(query.serviceCategory) : null;
    const filters = [
      ...(query.search
        ? [{
            OR: [
              { businessName: { contains: query.search, mode: "insensitive" as const } },
              { businessCategory: { contains: query.search, mode: "insensitive" as const } },
              { city: { contains: query.search, mode: "insensitive" as const } }
            ]
          }]
        : []),
      ...(query.serviceCategory
        ? [{
            OR: [
              { businessCategory: { contains: query.serviceCategory, mode: "insensitive" as const } },
              { category: { slug: query.serviceCategory.toLowerCase() } },
              ...(productCategory ? [{ products: { some: { productCategory, isActive: true, isAvailable: true, deletedAt: null } } }] : [])
            ]
          }]
        : [])
    ];
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(filters.length ? { AND: filters } : {})
      },
      include: {
        category: true,
        products: {
          where: { isActive: true, isAvailable: true, deletedAt: null },
          select: { preparationTimeMinutes: true }
        }
      },
      orderBy: { businessName: "asc" }
    });

    return vendors.map((vendor) => this.toPublicVendor(vendor));
  }

  async publicDetail(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, status: "ACTIVE", deletedAt: null },
      include: {
        category: true,
        products: {
          where: { isActive: true, isAvailable: true, deletedAt: null },
          select: { preparationTimeMinutes: true }
        }
      }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    return this.toPublicVendor(vendor);
  }

  private toPublicVendor(vendor: {
    id: string;
    businessName: string;
    businessCategory: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    openingTime: string | null;
    closingTime: string | null;
    isOpen: boolean;
    status: string;
    rating: { toNumber(): number } | null;
    category: { id: string; name: string; slug: string } | null;
    products: { preparationTimeMinutes: number | null }[];
  }) {
    const prepTimes = vendor.products
      .map((product) => product.preparationTimeMinutes)
      .filter((time): time is number => time !== null);
    const averagePreparationTimeMinutes = prepTimes.length
      ? Math.round(prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length)
      : null;

    return {
      id: vendor.id,
      businessName: vendor.businessName,
      businessCategory: vendor.businessCategory,
      category: vendor.category,
      description: vendor.description,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      logoUrl: vendor.logoUrl,
      coverImageUrl: vendor.coverImageUrl,
      openingTime: vendor.openingTime,
      closingTime: vendor.closingTime,
      isOpen: vendor.isOpen,
      status: vendor.status,
      rating: vendor.rating?.toNumber() ?? null,
      averagePreparationTimeMinutes
    };
  }

  private productCategoryForService(serviceCategory: ServiceCategory): ProductCategory | null {
    return serviceCategory === ServiceCategory.GROCERY
      ? ProductCategory.GROCERIES
      : serviceCategory === ServiceCategory.MARKET
        ? ProductCategory.MARKET_ITEMS
        : serviceCategory === ServiceCategory.FOOD
          ? ProductCategory.FOOD
          : null;
  }
}
