import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApprovedCaptainGuard } from "../../common/guards/approved-captain.guard";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { AuthModule } from "../auth/auth.module";
import { CaptainUploadStorageService } from "./captain-upload-storage.service";
import { AdminDeliveryCaptainApplicationsController, CaptainAccessController, DeliveryCaptainApplicationsController, RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [AuthModule, AdminAuditModule],
  controllers: [DeliveryCaptainApplicationsController, AdminDeliveryCaptainApplicationsController, RidersController, CaptainAccessController],
  providers: [RidersService, CaptainUploadStorageService, ApplicationNotificationsService, CaptainWorkStateService, AdminRolesGuard, ApprovedCaptainGuard]
})
export class RidersModule {}
