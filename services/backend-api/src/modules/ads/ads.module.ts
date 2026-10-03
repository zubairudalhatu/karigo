import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdsService } from "./ads.service";
import { AdminAdsController, CustomerAdsController, VendorAdsController } from "./ads.controller";
import { AdCreativeService } from "./ad-creative.service";
import { AdCreativeStorageService } from "./ad-creative-storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAdsController, VendorAdsController, AdminAdsController],
  providers: [AdsService, AdCreativeService, AdCreativeStorageService],
  exports: [AdsService]
})
export class AdsModule {}
