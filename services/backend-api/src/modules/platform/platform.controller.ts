import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlatformCatalogService } from "./platform-catalog.service";

@ApiTags("Platform")
@Controller("platform")
export class PlatformController {
  constructor(private readonly platformCatalog: PlatformCatalogService) {}

  @Get("vehicle-catalog")
  @ApiOperation({ summary: "Retrieve supported Captain vehicle makes, models, years and colours" })
  vehicleCatalog() {
    return { message: "Vehicle catalog retrieved", data: this.platformCatalog.vehicleCatalog() };
  }

  @Get("captain-service-areas")
  @ApiOperation({ summary: "Retrieve active KariGO Captain residential and operating areas" })
  captainServiceAreas() {
    return { message: "Captain service areas retrieved", data: this.platformCatalog.captainServiceAreas() };
  }
}
