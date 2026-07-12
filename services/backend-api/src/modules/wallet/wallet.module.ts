import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminWalletController, WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";

@Module({
  imports: [AuthModule, AdminAuditModule],
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService, AdminRolesGuard]
})
export class WalletModule {}
