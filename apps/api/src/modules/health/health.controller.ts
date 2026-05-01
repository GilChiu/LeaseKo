import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './presentation/dto/health-response.dto';

@ApiTags('System')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns API liveness status. Public — no authentication required.',
  })
  @ApiOkResponse({ type: HealthResponseDto, description: 'API is healthy' })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
