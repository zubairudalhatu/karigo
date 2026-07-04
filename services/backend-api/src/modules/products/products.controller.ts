import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { ProductInputDto } from "./dto/product-input.dto";
import { UpdateProductAvailabilityDto } from "./dto/update-product-availability.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@ApiTags("Products")
@Controller("vendors/:vendorId/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List available products for an active vendor" })
  async list(@Param("vendorId", ParseUUIDPipe) vendorId: string, @Query() query: ListProductsQueryDto) {
    return {
      message: "Available products retrieved",
      data: await this.productsService.listForActiveVendor(vendorId, query)
    };
  }
}

@ApiTags("Products")
@Controller("products")
export class ProductCatalogueController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List public available products across active vendors" })
  async list(@Query() query: ListProductsQueryDto) {
    return {
      message: "Available products retrieved",
      data: await this.productsService.listPublicCatalogue(query)
    };
  }
}

@ApiTags("Vendor Products")
@Controller("vendor/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth()
export class VendorProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List products owned by the authenticated vendor" })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListProductsQueryDto) {
    return {
      message: "Vendor products retrieved",
      data: await this.productsService.listVendorProducts(user.id, query)
    };
  }

  @Post()
  @ApiOperation({ summary: "Create a product owned by the authenticated vendor" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProductInputDto) {
    return {
      message: "Product created",
      data: await this.productsService.createVendorProduct(user.id, dto)
    };
  }

  @Get(":productId")
  @ApiOperation({ summary: "Get a product owned by the authenticated vendor" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("productId", ParseUUIDPipe) productId: string) {
    return {
      message: "Product retrieved",
      data: await this.productsService.getVendorProduct(user.id, productId)
    };
  }

  @Patch(":productId")
  @ApiOperation({ summary: "Update a product owned by the authenticated vendor" })
  async update(@CurrentUser() user: AuthenticatedUser, @Param("productId", ParseUUIDPipe) productId: string, @Body() dto: UpdateProductDto) {
    return {
      message: "Product updated",
      data: await this.productsService.updateVendorProduct(user.id, productId, dto)
    };
  }

  @Patch(":productId/availability")
  @ApiOperation({ summary: "Update product availability for the authenticated vendor" })
  async availability(@CurrentUser() user: AuthenticatedUser, @Param("productId", ParseUUIDPipe) productId: string, @Body() dto: UpdateProductAvailabilityDto) {
    return {
      message: "Product availability updated",
      data: await this.productsService.updateVendorProductAvailability(user.id, productId, dto)
    };
  }

  @Delete(":productId")
  @ApiOperation({ summary: "Archive a product owned by the authenticated vendor" })
  async archive(@CurrentUser() user: AuthenticatedUser, @Param("productId", ParseUUIDPipe) productId: string) {
    return {
      message: "Product archived",
      data: await this.productsService.archiveVendorProduct(user.id, productId)
    };
  }
}
