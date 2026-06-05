import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * ListUnitsQueryDto — query parameters for GET /properties/:propertyId/units.
 *
 * Architecture rules:
 * - tenantId is NOT a query parameter — it comes from verified JWT context only.
 * - propertyId is NOT a query parameter — it comes from the URL path parameter only.
 * - @Type(() => Number) coerces string query params before class-validator runs.
 */
export class ListUnitsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number (1-based)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 50,
    minimum: 1,
    maximum: 100,
    description: 'Items per page (default: 50, max: 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
