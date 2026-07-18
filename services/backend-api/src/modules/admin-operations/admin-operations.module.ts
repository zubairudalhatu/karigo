import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AuthModule } from "../auth/auth.module";
import { AdminOperationsController } from "./admin-operations.controller";
import { AdminOperationsService } from "./admin-operations.service";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminSettlementsController } from "./admin-settlements.controller";
import { SettlementsService } from "./settlements.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminOperationsController, AdminReportsController, AdminSettlementsController],
  providers: [AdminOperationsService, SettlementsService, ApplicationNotificationsService, AdminRolesGuard]
})
export class AdminOperationsModule {}
