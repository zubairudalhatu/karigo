import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ProductsService } from "./products.service";

@ApiTags("Products")
@Controller("vendors/:vendorId/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List available products for an active vendor" })
  async list(@Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return {
      message: "Available products retrieved",
      data: await this.productsService.listForActiveVendor(vendorId)
    };
  }
}
