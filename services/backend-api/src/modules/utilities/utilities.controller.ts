import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UtilityProductsQueryDto, UtilityProvidersQueryDto } from "./dto/utility-catalogue-query.dto";
import { UtilitiesService } from "./utilities.service";

@ApiTags("Utilities")
@Controller("utilities")
export class UtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get("providers")
  @ApiOperation({ summary: "List active Bills & Utilities providers" })
  async providers(@Query() query: UtilityProvidersQueryDto) {
    return { message: "Utility providers retrieved", data: await this.utilities.listProviders(query) };
  }

  @Get("products")
  @ApiOperation({ summary: "List active Bills & Utilities products" })
  async products(@Query() query: UtilityProductsQueryDto) {
    return { message: "Utility products retrieved", data: await this.utilities.listProducts(query) };
  }
}
