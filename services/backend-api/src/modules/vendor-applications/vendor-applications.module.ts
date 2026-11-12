import { AuthModule } from "../auth/auth.module";
import { VendorsModule } from "../vendors/vendors.module";
import { PartnerMobileFilesService } from "./partner-mobile-files.service";
import { PartnerMobileOnboardingController, PartnerMobilePushController, PartnerMobileFileReviewController } from "./partner-mobile.controller";
import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AdminVendorApplicationsController, PublicVendorApplicationsController } from "./vendor-applications.controller";
import { PartnerCommercialModule } from "../partner-commercial/partner-commercial.module";
import { VendorApplicationsService } from "./vendor-applications.service";

@Module({
  controllers: [PartnerMobileOnboardingController, PartnerMobilePushController, PartnerMobileFileReviewController, PublicVendorApplicationsController, AdminVendorApplicationsController],
  imports: [PartnerCommercialModule, AuthModule, VendorsModule],
  providers: [PartnerMobileFilesService, VendorApplicationsService, ApplicationNotificationsService, AdminRolesGuard],
  exports: [VendorApplicationsService, PartnerMobileFilesService]
})
export class VendorApplicationsModule {}
