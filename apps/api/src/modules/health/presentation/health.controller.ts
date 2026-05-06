import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AppConfig } from "../../../common/config/app.config";
import { Public } from "../../../common/decorators/public.decorator";
import { HealthResponseDto } from "./dto/health-response.dto";

@ApiTags("System")
@Controller()
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get("health")
  @Public()
  @ApiOperation({
    summary: "Health check",
    description:
      "Returns API liveness status. Public — no authentication required.",
  })
  @ApiOkResponse({ type: HealthResponseDto, description: "API is healthy" })
  check(): HealthResponseDto {
    const { nodeEnv } = this.configService.getOrThrow<AppConfig>("app");
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 100) / 100,
      environment: nodeEnv,
    };
  }
}
