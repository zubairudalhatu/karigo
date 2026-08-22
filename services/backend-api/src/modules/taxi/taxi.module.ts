import { RideCommunicationsService } from "./ride-communications.service";
import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../../common/services/admin-audit.module";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { CaptainUploadStorageService } from "../riders/captain-upload-storage.service";
import { AdminTaxiController } from "./admin-taxi.controller";
import { CustomerTaxiController } from "./customer-taxi.controller";
import { RiderTaxiController } from "./rider-taxi.controller";
import { RideCallService } from "./ride-call.service";
import { RideRealtimeGateway } from "./ride-realtime.gateway";
import { RideRealtimeService } from "./ride-realtime.service";
import { TaxiMapsService } from "./taxi-maps.service";
import { TaxiController } from "./taxi.controller";
import { TaxiService } from "./taxi.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [TaxiController, CustomerTaxiController, RiderTaxiController, AdminTaxiController],
  providers: [
    TaxiService,
    TaxiMapsService,
    RideCallService,
    RideCommunicationsService,
    RideRealtimeService,
    RideRealtimeGateway,
    CaptainUploadStorageService,
    ApplicationNotificationsService,
    CaptainWorkStateService
  ],
  exports: [TaxiService]
})
export class TaxiModule {}
