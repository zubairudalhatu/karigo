import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminTaxiController } from "./admin-taxi.controller";
import { TaxiController } from "./taxi.controller";
import { TaxiService } from "./taxi.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [TaxiController, AdminTaxiController],
  providers: [TaxiService],
  exports: [TaxiService]
})
export class TaxiModule {}
