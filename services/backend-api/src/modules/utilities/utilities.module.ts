import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminUtilitiesController } from "./admin-utilities.controller";
import { CustomerUtilitiesController } from "./customer-utilities.controller";
import { AccelerateUtilityProvider } from "./providers/accelerate-utility.provider";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
import { PaybetaUtilityProvider } from "./providers/paybeta-utility.provider";
import { UtilitiesController } from "./utilities.controller";
import { UtilitiesService } from "./utilities.service";
import { GotvAcceptanceController } from "./gotv-acceptance.controller";
import { GotvAcceptanceService } from "./gotv-acceptance.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [UtilitiesController, CustomerUtilitiesController, AdminUtilitiesController, GotvAcceptanceController],
  providers: [UtilitiesService, MockUtilityProvider, AccelerateUtilityProvider, PaybetaUtilityProvider, GotvAcceptanceService],
  exports: [UtilitiesService]
})
export class UtilitiesModule {}
