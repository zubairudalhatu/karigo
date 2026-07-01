import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check API health" })
  check() {
    return {
      message: "KariGO API is healthy",
      data: {
        service: "backend-api",
        status: "ok",
        timestamp: new Date().toISOString()
      }
    };
  }
}

