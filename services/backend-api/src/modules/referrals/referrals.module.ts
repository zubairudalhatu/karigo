import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AdminReferralsController, ReferralsController } from "./referrals.controller";
import { ReferralsService } from "./referrals.service";

@Module({
  imports: [PrismaModule, AdminAuditModule, AuthModule],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService, AdminRolesGuard],
  exports: [ReferralsService]
})
export class ReferralsModule {}
