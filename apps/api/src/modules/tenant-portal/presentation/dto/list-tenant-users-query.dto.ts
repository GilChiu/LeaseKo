import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TenantUserStatus } from '../../domain/entities/tenant-user.entity';

const TENANT_USER_STATUS_VALUES: TenantUserStatus[] = [
  'PENDING',
  'ACTIVE',
  'REVOKED',
];

export class ListTenantUsersQueryDto {
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
    enum: TENANT_USER_STATUS_VALUES,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsIn(TENANT_USER_STATUS_VALUES)
  status?: TenantUserStatus;
}
