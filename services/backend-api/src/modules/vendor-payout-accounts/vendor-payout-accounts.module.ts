import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminVendorPayoutAccountsController, VendorPayoutAccountsController } from "./vendor-payout-accounts.controller";
import { VendorPayoutAccountsService } from "./vendor-payout-accounts.service";

@Module({
  imports: [AuthModule],
  controllers: [VendorPayoutAccountsController, AdminVendorPayoutAccountsController],
  providers: [VendorPayoutAccountsService, AdminRolesGuard]
})
export class VendorPayoutAccountsModule {}
