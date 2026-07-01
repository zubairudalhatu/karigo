import { Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminSupportController } from "./admin-support.controller";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { SupportStatusService } from "./support-status.service";

@Module({
  imports: [AuthModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, SupportStatusService, AdminRolesGuard]
})
export class SupportModule {}
