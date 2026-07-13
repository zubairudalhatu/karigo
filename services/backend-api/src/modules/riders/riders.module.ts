import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DeliveryCaptainApplicationsController, RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";

@Module({
  imports: [AuthModule],
  controllers: [DeliveryCaptainApplicationsController, RidersController],
  providers: [RidersService]
})
export class RidersModule {}
