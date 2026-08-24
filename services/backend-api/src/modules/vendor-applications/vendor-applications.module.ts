import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AdminVendorApplicationsController, PublicVendorApplicationsController } from "./vendor-applications.controller";
import { PartnerCommercialModule } from "../partner-commercial/partner-commercial.module";
import { VendorApplicationsService } from "./vendor-applications.service";

@Module({
  controllers: [PublicVendorApplicationsController, AdminVendorApplicationsController],
  imports: [PartnerCommercialModule],
  providers: [VendorApplicationsService, ApplicationNotificationsService, AdminRolesGuard]
})
export class VendorApplicationsModule {}
