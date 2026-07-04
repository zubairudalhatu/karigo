import { Injectable } from "@nestjs/common";
import { Prisma, ProductCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const categories = [
  { key: "food", label: "Food Delivery", serviceCategory: "FOOD", href: "/catalogue/food", enabled: true },
  { key: "groceries", label: "Groceries", serviceCategory: "GROCERY", href: "/catalogue/groceries", enabled: true },
  { key: "market-items", label: "Market Items", serviceCategory: "MARKET", href: "/catalogue/market-items", enabled: true },
  { key: "pharmacy", label: "Pharmacy", serviceCategory: "PHARMACY", href: "/catalogue/pharmacy", enabled: false },
  { key: "parcel", label: "Parcel Delivery", serviceCategory: "PARCEL", href: "/parcel", enabled: true },
  { key: "sme-errands", label: "SME Errands", serviceCategory: "ERRAND", href: "/parcel?mode=errand", enabled: true }
];

const VENDOR_SELECT = {
  id: true,
  businessName: true,
  businessCategory: true,
  description: true,
  address: true,
  city: true,
  state: true,
  logoUrl: true,
  coverImageUrl: true,
  openingTime: true,
  closingTime: true,
  isOpen: true,
  status: true,
  rating: true,
  category: { select: { id: true, name: true, slug: true } },
  products: { where: { isActive: true, isAvailable: true, deletedAt: null }, select: { preparationTimeMinutes: true } }
} satisfies Prisma.VendorSelect;

@Injectable()
export class MarketplaceDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async home() {
    return {
      categories: this.categories(),
      featuredVendors: await this.featuredVendors(3),
      adBanner: null
    };
  }

  categories() {
    const pharmacyEnabled = this.pharmacyEnabled();
    return categories.map((category) => ({
      ...category,
      enabled: category.serviceCategory === "PHARMACY" ? pharmacyEnabled : category.enabled
    }));
  }

  async featuredVendors(limit = 3) {
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(this.pharmacyEnabled() ? {} : { NOT: [{ businessCategory: { contains: "PHARMACY", mode: "insensitive" } }, { category: { slug: "pharmacy" } }] })
      },
      select: VENDOR_SELECT,
      orderBy: [{ isOpen: "desc" }, { totalOrders: "desc" }, { businessName: "asc" }],
      take: limit
    });
    return vendors.map((vendor) => this.toVendorCard(vendor));
  }

  async topRestaurants() {
    return this.vendorsFor("FOOD");
  }

  async topGroceryVendors() {
    return this.vendorsFor("GROCERY", "MARKET");
  }

  async topPharmacyVendors() {
    if (!this.pharmacyEnabled()) return [];
    return this.vendorsFor("PHARMACY");
  }

  async topProducts(category?: ProductCategory) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        deletedAt: null,
        ...(category ? { productCategory: category } : {}),
        vendor: {
          status: "ACTIVE",
          deletedAt: null,
          ...(this.pharmacyEnabled() ? {} : { NOT: [{ businessCategory: { contains: "PHARMACY", mode: "insensitive" } }, { category: { slug: "pharmacy" } }] })
        }
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        description: true,
        category: true,
        productCategory: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        isFeatured: true,
        vendor: { select: { businessName: true, businessCategory: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 12
    });

    return products.map((product) => ({
      id: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendor.businessName,
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? product.productCategory,
      productCategory: product.productCategory,
      price: product.price.toNumber(),
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured
    }));
  }

  adBanner() {
    return null;
  }

  private async vendorsFor(...businessCategories: string[]) {
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        OR: [
          ...businessCategories.map((category) => ({ businessCategory: { contains: category, mode: "insensitive" as const } })),
          ...businessCategories.map((category) => ({ category: { slug: category.toLowerCase() } }))
        ]
      },
      select: VENDOR_SELECT,
      orderBy: [{ isOpen: "desc" }, { totalOrders: "desc" }, { businessName: "asc" }],
      take: 12
    });
    return vendors.map((vendor) => this.toVendorCard(vendor));
  }

  private toVendorCard(vendor: Prisma.VendorGetPayload<{ select: typeof VENDOR_SELECT }>) {
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
      category: vendor.category,
      averagePreparationTimeMinutes
    };
  }

  private pharmacyEnabled() {
    return process.env.PHARMACY_MARKETPLACE_ENABLED === "true";
  }
}
