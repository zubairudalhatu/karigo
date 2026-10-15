import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AccountDeletionController, AdminAccountDeletionController } from "./account-deletion.controller";
import { AccountDeletionService } from "./account-deletion.service";
import { RidersModule } from "../riders/riders.module";
import { VendorsModule } from "../vendors/vendors.module";
import { CustomerErasureService } from "./customer-erasure.service";
import { CustomerDeletionNoticeService } from "./customer-deletion-notice.service";
import { CustomerDeletionReceiptController } from "./customer-deletion-receipt.controller";

@Module({
  imports: [PrismaModule, AdminAuditModule, RidersModule, VendorsModule],
  controllers: [AccountDeletionController, AdminAccountDeletionController, CustomerDeletionReceiptController],
  providers: [AccountDeletionService, CustomerErasureService, CustomerDeletionNoticeService],
  exports: [CustomerErasureService]
})
export class AccountDeletionModule {}
