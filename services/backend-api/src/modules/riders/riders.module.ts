import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApprovedCaptainGuard } from "../../common/guards/approved-captain.guard";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AuthModule } from "../auth/auth.module";
import { AdminDeliveryCaptainApplicationsController, DeliveryCaptainApplicationsController, RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [AuthModule, AdminAuditModule],
  controllers: [DeliveryCaptainApplicationsController, AdminDeliveryCaptainApplicationsController, RidersController],
  providers: [RidersService, ApplicationNotificationsService, AdminRolesGuard, ApprovedCaptainGuard]
})
export class RidersModule {}
