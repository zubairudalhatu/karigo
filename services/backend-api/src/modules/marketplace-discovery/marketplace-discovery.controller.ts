import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ProductCategory } from "@prisma/client";
import { MarketplaceDiscoveryService } from "./marketplace-discovery.service";

@ApiTags("Marketplace Discovery")
@Controller("discovery")
export class MarketplaceDiscoveryController {
  constructor(private readonly discoveryService: MarketplaceDiscoveryService) {}

  @Get("home")
  @ApiOperation({ summary: "Get category-first customer homepage discovery content" })
  async home() {
    return { message: "Discovery homepage retrieved", data: await this.discoveryService.home() };
  }

  @Get("categories")
  async categories() {
    return { message: "Discovery categories retrieved", data: this.discoveryService.categories() };
  }

  @Get("featured-vendors")
  async featuredVendors() {
    return { message: "Featured vendors retrieved", data: await this.discoveryService.featuredVendors(3) };
  }

  @Get("top-restaurants")
  async topRestaurants() {
    return { message: "Top restaurants retrieved", data: await this.discoveryService.topRestaurants() };
  }

  @Get("top-grocery-vendors")
  async topGroceryVendors() {
    return { message: "Top grocery and market vendors retrieved", data: await this.discoveryService.topGroceryVendors() };
  }

  @Get("top-pharmacy-vendors")
  async topPharmacyVendors() {
    return { message: "Top pharmacy vendors retrieved", data: await this.discoveryService.topPharmacyVendors() };
  }

  @Get("top-products")
  async topProducts(@Query("category") category?: ProductCategory) {
    return { message: "Top products retrieved", data: await this.discoveryService.topProducts(category) };
  }

  @Get("ad-banner")
  async adBanner() {
    return { message: "No approved marketplace ad banner is active", data: this.discoveryService.adBanner() };
  }
}
