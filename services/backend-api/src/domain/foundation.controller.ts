import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

const modules = [
  "Auth",
  "Customers",
  "Addresses",
  "Vendors",
  "Products",
  "Orders",
  "Payments",
  "Vendor Orders",
  "Dispatch",
  "Rider Jobs",
  "Support",
  "Admin Dashboard",
  "Reports",
  "Settlements",
  "Promotions",
  "Notifications"
];

@ApiTags("Platform")
@Controller("platform")
export class FoundationController {
  @Get("modules")
  @ApiOperation({ summary: "List planned MVP backend modules" })
  listModules() {
    return { message: "MVP module registry", data: modules };
  }

  @Get("service-categories/:category")
  @ApiParam({ name: "category", enum: ["FOOD", "GROCERY", "MARKET", "PARCEL", "ERRAND", "CORPORATE"] })
  @ApiOperation({ summary: "Inspect an enabled MVP service category" })
  serviceCategory(@Param("category") category: string) {
    return { message: "MVP service category", data: { category } };
  }
}
