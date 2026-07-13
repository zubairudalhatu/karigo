import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminTaxiController } from "./admin-taxi.controller";
import { CustomerTaxiController } from "./customer-taxi.controller";
import { RiderTaxiController } from "./rider-taxi.controller";
import { TaxiController } from "./taxi.controller";
import { TaxiService } from "./taxi.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [TaxiController, CustomerTaxiController, RiderTaxiController, AdminTaxiController],
  providers: [TaxiService, ApplicationNotificationsService],
  exports: [TaxiService]
})
export class TaxiModule {}
