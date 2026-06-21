import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RevenueQueryDto {
  @ApiPropertyOptional({
    minimum: 2000,
    description: 'Year of the reporting window (defaults to current year)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 12,
    description: 'Month of the reporting window, 1-12 (defaults to current month)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
