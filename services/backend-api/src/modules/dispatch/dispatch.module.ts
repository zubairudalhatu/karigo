import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminDispatchController } from "./admin-dispatch.controller";
import { DispatchEventsService } from "./dispatch-events.service";
import { DispatchStatusService } from "./dispatch-status.service";
import { DispatchService } from "./dispatch.service";
import { RiderDispatchController } from "./rider-dispatch.controller";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [AdminDispatchController, RiderDispatchController],
  providers: [DispatchService, DispatchStatusService, DispatchEventsService, AdminRolesGuard]
})
export class DispatchModule {}
