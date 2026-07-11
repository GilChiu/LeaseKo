import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority } from '../../../maintenance/domain/entities/maintenance-request.entity';

const MAINTENANCE_PRIORITY_VALUES: MaintenancePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

/**
 * Payload for a renter submitting a maintenance request from the tenant portal.
 *
 * Note: there is deliberately NO propertyId/unitId here. The unit is resolved
 * from the renter's active lease server-side, so a renter can only file against
 * the unit they occupy.
 */
export class SubmitMaintenanceRequestDto {
  @ApiProperty({
    example: 'Leaking faucet in kitchen',
    description: 'Short title for the maintenance request',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'The kitchen faucet has been dripping for 2 days.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    enum: MAINTENANCE_PRIORITY_VALUES,
    example: 'MEDIUM',
    description: 'Priority level',
  })
  @IsIn(MAINTENANCE_PRIORITY_VALUES)
  priority!: MaintenancePriority;
}
