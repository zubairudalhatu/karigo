import { Body, Controller, Headers, Injectable, Module, Post, ServiceUnavailableException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { RetentionAlertsService } from "./retention-alerts.service";
import { GoogleWorkloadIdentity } from "./workload-identity";

@Controller("internal/retention-alerts")
export class RetentionAlertsController {
  private readonly identity = new GoogleWorkloadIdentity();
  constructor(private readonly service: RetentionAlertsService, private readonly config: ConfigService) {}
  @Post("report")
  async report(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    if (this.config.get<string>("RETENTION_ALERTS_ENABLED") !== "true") throw new ServiceUnavailableException("Retention reporting is disabled.");
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("Workload authentication required.");
    try {
      await this.identity.authenticate(authorization.slice(7), this.config.get<string>("RETENTION_REPORT_AUDIENCE", ""),
        "karigo-export-custodian@mystical-method-475123-s9.iam.gserviceaccount.com",
        this.config.get<string>("RETENTION_REPORT_SUBJECT", ""));
    } catch { throw new UnauthorizedException("Workload authentication failed."); }
    try { return { accepted: true, fresh: await this.service.engine.report(body) }; }
    catch (e) {
      if (e instanceof Error && ["INVALID_REPORT", "REPORT_CONFLICT"].includes(e.message)) throw new BadRequestException("Invalid or conflicting aggregate report.");
      throw new ServiceUnavailableException("Retention reporting temporarily unavailable.");
    }
  }
}
@Module({ imports: [PrismaModule], controllers: [RetentionAlertsController], providers: [RetentionAlertsService] })
export class RetentionAlertsModule {}
