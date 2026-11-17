import { VendorOrderAccessGuard } from "../vendor-dashboard-orders/vendor-order-access";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";
import { VendorPrivateUploadStorageService } from "./vendor-private-upload-storage.service";

@Module({
  imports: [AuthModule],
  controllers: [VendorsController],
  providers: [VendorOrderAccessGuard, VendorsService, VendorPrivateUploadStorageService],
  exports: [VendorPrivateUploadStorageService]
})
export class VendorsModule {}
