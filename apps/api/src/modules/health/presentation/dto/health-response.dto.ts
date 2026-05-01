import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'API liveness status' })
  status!: string;

  @ApiProperty({ example: 'api', description: 'Service identifier' })
  service!: string;

  @ApiProperty({ example: '2026-05-02T12:00:00.000Z', description: 'ISO 8601 UTC timestamp of the response' })
  timestamp!: string;
}
