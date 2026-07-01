import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PromoModule } from "../promos/promo.module";

@Module({
  imports: [AuthModule, PromoModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
