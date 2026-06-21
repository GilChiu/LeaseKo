import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceStatus } from '../../domain/entities/maintenance-request.entity';

const MAINTENANCE_STATUS_VALUES: MaintenanceStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export class UpdateMaintenanceStatusDto {
  @ApiProperty({
    enum: MAINTENANCE_STATUS_VALUES,
    example: 'IN_PROGRESS',
    description: 'New status for the maintenance request',
  })
  @IsIn(MAINTENANCE_STATUS_VALUES)
  status!: MaintenanceStatus;
}
