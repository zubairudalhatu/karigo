import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdsService } from "./ads.service";
import { AdminAdsController, CustomerAdsController, VendorAdsController } from "./ads.controller";
import { AdCreativeService } from "./ad-creative.service";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAdsController, VendorAdsController, AdminAdsController],
  providers: [AdsService, AdCreativeService],
  exports: [AdsService]
})
export class AdsModule {}
