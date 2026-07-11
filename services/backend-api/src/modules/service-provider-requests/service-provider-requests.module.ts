import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ServiceProviderRequestsController } from "./service-provider-requests.controller";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

@Module({
  imports: [PrismaModule],
  controllers: [ServiceProviderRequestsController],
  providers: [ServiceProviderRequestsService],
  exports: [ServiceProviderRequestsService]
})
export class ServiceProviderRequestsModule {}
