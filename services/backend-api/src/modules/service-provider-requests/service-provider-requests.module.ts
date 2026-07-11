import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminServiceProviderRequestsController, AdminServiceProvidersController, ServiceProviderRequestsController } from "./service-provider-requests.controller";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

@Module({
  imports: [PrismaModule],
  controllers: [ServiceProviderRequestsController, AdminServiceProviderRequestsController, AdminServiceProvidersController],
  providers: [ServiceProviderRequestsService],
  exports: [ServiceProviderRequestsService]
})
export class ServiceProviderRequestsModule {}
