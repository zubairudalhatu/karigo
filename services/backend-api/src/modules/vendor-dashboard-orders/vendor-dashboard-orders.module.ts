import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VendorDashboardOrdersController } from "./vendor-dashboard-orders.controller";
import { VendorDashboardOrdersService } from "./vendor-dashboard-orders.service";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";

@Module({
  imports: [AuthModule],
  controllers: [VendorDashboardOrdersController],
  providers: [VendorDashboardOrdersService, VendorOrderStatusService, VendorOrderEventsService]
})
export class VendorDashboardOrdersModule {}
