import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminPromoController } from "./admin-promo.controller";
import { AdminPromoReportController } from "./admin-promo-report.controller";
import { PromoController } from "./promo.controller";
import { PromoService } from "./promo.service";

@Module({
  imports: [AuthModule],
  controllers: [PromoController, AdminPromoController, AdminPromoReportController],
  providers: [PromoService, AdminRolesGuard],
  exports: [PromoService]
})
export class PromoModule {}
