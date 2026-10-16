import { Controller, Get, Header, ServiceUnavailableException } from "@nestjs/common";
import { ReadinessService } from "./readiness.service";

@Controller("health")
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get("ready")
  @Header("Cache-Control", "no-store")
  async check() {
    if (!await this.readiness.ready()) {
      throw new ServiceUnavailableException({ message: "Service not ready", error_code: "NOT_READY" });
    }
    return { data: { status: "ready" } };
  }
}
