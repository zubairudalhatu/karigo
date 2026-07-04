import { Module } from "@nestjs/common";
import { ProductCatalogueController, ProductsController, VendorProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController, ProductCatalogueController, VendorProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
