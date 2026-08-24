import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminPartnerCommercialController, PartnerCommercialController } from "./partner-commercial.controller";
import { PartnerCommercialService } from "./partner-commercial.service";

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [PartnerCommercialController, AdminPartnerCommercialController],
  providers: [PartnerCommercialService, AdminRolesGuard],
  exports: [PartnerCommercialService]
})
export class PartnerCommercialModule {}
