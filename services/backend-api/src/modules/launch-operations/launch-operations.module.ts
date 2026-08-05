import { Global, Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AdminLaunchOperationsController, LaunchAvailabilityController } from "./launch-operations.controller";
import { LaunchOperationsService } from "./launch-operations.service";

@Global()
@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [LaunchAvailabilityController, AdminLaunchOperationsController],
  providers: [LaunchOperationsService, AdminRolesGuard],
  exports: [LaunchOperationsService]
})
export class LaunchOperationsModule {}

\n