import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AccountDeletionController, AdminAccountDeletionController } from "./account-deletion.controller";
import { AccountDeletionService } from "./account-deletion.service";
import { RidersModule } from "../riders/riders.module";
import { VendorsModule } from "../vendors/vendors.module";

@Module({
  imports: [PrismaModule, AdminAuditModule, RidersModule, VendorsModule],
  controllers: [AccountDeletionController, AdminAccountDeletionController],
  providers: [AccountDeletionService]
})
export class AccountDeletionModule {}
