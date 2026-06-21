import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';

const MAINTENANCE_STATUS_VALUES: MaintenanceStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];
const MAINTENANCE_PRIORITY_VALUES: MaintenancePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export class ListMaintenanceRequestsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number (1-indexed)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: MAINTENANCE_STATUS_VALUES,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsIn(MAINTENANCE_STATUS_VALUES)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({
    enum: MAINTENANCE_PRIORITY_VALUES,
    description: 'Filter by priority',
  })
  @IsOptional()
  @IsIn(MAINTENANCE_PRIORITY_VALUES)
  priority?: MaintenancePriority;
}
