import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LeaseStatus } from '../../domain/entities/lease.entity';

const LEASE_STATUS_VALUES: LeaseStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

export class ListLeasesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-indexed)' })
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

  @ApiPropertyOptional({
    enum: LEASE_STATUS_VALUES,
    description: 'Filter by lease status',
  })
  @IsOptional()
  @IsIn(LEASE_STATUS_VALUES)
  status?: LeaseStatus;
}
