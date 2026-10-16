import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ReadinessController } from "./readiness.controller";
import { ReadinessService, READINESS_MIGRATIONS, readinessManifest } from "./readiness.service";

@Module({
  controllers: [HealthController, ReadinessController],
  providers: [ReadinessService, { provide: READINESS_MIGRATIONS, useFactory: readinessManifest }]
})
export class HealthModule {}

