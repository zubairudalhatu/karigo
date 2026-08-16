import { Global, Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AdminLaunchOperationsController, LaunchAvailabilityController } from "./launch-operations.controller";
import { LaunchOperationsService } from "./launch-operations.service";
import { ControlledSupplyService } from "./controlled-supply.service";
import { QuickLaunchService } from "./quick-launch.service";
import { AdminOperationsModule } from "../admin-operations/admin-operations.module";

@Global()
@Module({
  imports: [PrismaModule, AdminAuditModule, AdminOperationsModule],
  controllers: [LaunchAvailabilityController, AdminLaunchOperationsController],
  providers: [LaunchOperationsService, ControlledSupplyService, QuickLaunchService, AdminRolesGuard],
  exports: [LaunchOperationsService, ControlledSupplyService]
})
export class LaunchOperationsModule {}
