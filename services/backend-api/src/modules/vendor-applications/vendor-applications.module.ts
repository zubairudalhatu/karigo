import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AdminVendorApplicationsController, PublicVendorApplicationsController } from "./vendor-applications.controller";
import { VendorApplicationsService } from "./vendor-applications.service";

@Module({
  controllers: [PublicVendorApplicationsController, AdminVendorApplicationsController],
  providers: [VendorApplicationsService, AdminRolesGuard]
})
export class VendorApplicationsModule {}
