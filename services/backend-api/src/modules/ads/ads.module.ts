import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdsService } from "./ads.service";
import { AdminAdsController, CustomerAdsController, VendorAdsController } from "./ads.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAdsController, VendorAdsController, AdminAdsController],
  providers: [AdsService],
  exports: [AdsService]
})
export class AdsModule {}
