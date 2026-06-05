import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * ListPropertiesQueryDto — query parameters for GET /properties.
 *
 * Architecture rules:
 * - tenantId is NOT a query parameter — it comes from verified JWT context only.
 * - @Type(() => Number) coerces the string query param before class-validator runs.
 */
export class ListPropertiesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
