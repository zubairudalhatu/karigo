import { Module } from "@nestjs/common";
import { PlatformController } from "./platform.controller";
import { PlatformCatalogService } from "./platform-catalog.service";

@Module({
  controllers: [PlatformController],
  providers: [PlatformCatalogService],
  exports: [PlatformCatalogService]
})
export class PlatformModule {}
