import { Module } from "@nestjs/common";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PromoModule } from "../promos/promo.module";

@Module({
  imports: [AuthModule, PromoModule],
  controllers: [OrdersController],
  providers: [OrdersService, ApplicationNotificationsService]
})
export class OrdersModule {}
