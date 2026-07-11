import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminServiceProviderApplicationsController, PublicServiceProviderApplicationsController } from "./service-provider-applications.controller";
import { ServiceProviderApplicationsService } from "./service-provider-applications.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicServiceProviderApplicationsController, AdminServiceProviderApplicationsController],
  providers: [ServiceProviderApplicationsService],
  exports: [ServiceProviderApplicationsService]
})
export class ServiceProviderApplicationsModule {}
