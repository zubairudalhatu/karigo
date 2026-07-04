import { Module } from "@nestjs/common";
import { MarketplaceDiscoveryController } from "./marketplace-discovery.controller";
import { MarketplaceDiscoveryService } from "./marketplace-discovery.service";

@Module({
  controllers: [MarketplaceDiscoveryController],
  providers: [MarketplaceDiscoveryService]
})
export class MarketplaceDiscoveryModule {}
