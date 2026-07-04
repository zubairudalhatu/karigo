import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VendorSettlementsController } from "./vendor-settlements.controller";
import { VendorSettlementsService } from "./vendor-settlements.service";

@Module({
  imports: [AuthModule],
  controllers: [VendorSettlementsController],
  providers: [VendorSettlementsService]
})
export class VendorSettlementsModule {}
