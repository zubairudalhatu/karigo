import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminUtilitiesController } from "./admin-utilities.controller";
import { CustomerUtilitiesController } from "./customer-utilities.controller";
import { AccelerateUtilityProvider } from "./providers/accelerate-utility.provider";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
import { UtilitiesController } from "./utilities.controller";
import { UtilitiesService } from "./utilities.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [UtilitiesController, CustomerUtilitiesController, AdminUtilitiesController],
  providers: [UtilitiesService, MockUtilityProvider, AccelerateUtilityProvider],
  exports: [UtilitiesService]
})
export class UtilitiesModule {}
