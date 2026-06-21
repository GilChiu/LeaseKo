import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';

export class MaintenanceRequestResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-property' })
  propertyId!: string;

  @ApiProperty({ example: 'uuid-of-unit' })
  unitId!: string;

  @ApiProperty({ example: 'Leaking faucet in kitchen' })
  title!: string;

  @ApiPropertyOptional({
    example: 'The kitchen faucet has been dripping for 2 days.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    example: 'OPEN',
  })
  status!: MaintenanceStatus;

  @ApiProperty({
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    example: 'MEDIUM',
  })
  priority!: MaintenancePriority;

  @ApiPropertyOptional({
    example: 'Tenant mentioned this started last week.',
    nullable: true,
  })
  notes!: string | null;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(
    request: MaintenanceRequest,
  ): MaintenanceRequestResponseDto {
    const dto = new MaintenanceRequestResponseDto();
    dto.id = request.id;
    dto.tenantId = request.tenantId;
    dto.propertyId = request.propertyId;
    dto.unitId = request.unitId;
    dto.title = request.title;
    dto.description = request.description;
    dto.status = request.status;
    dto.priority = request.priority;
    dto.notes = request.notes;
    dto.createdAt = request.createdAt;
    dto.updatedAt = request.updatedAt;
    return dto;
  }
}
