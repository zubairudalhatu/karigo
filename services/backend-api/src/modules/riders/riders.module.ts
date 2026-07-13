import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AuthModule } from "../auth/auth.module";
import { AdminDeliveryCaptainApplicationsController, DeliveryCaptainApplicationsController, RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [AuthModule],
  controllers: [DeliveryCaptainApplicationsController, AdminDeliveryCaptainApplicationsController, RidersController],
  providers: [RidersService, ApplicationNotificationsService, AdminRolesGuard]
})
export class RidersModule {}
