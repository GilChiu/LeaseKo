import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority } from '../../domain/entities/maintenance-request.entity';

const MAINTENANCE_PRIORITY_VALUES: MaintenancePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export class CreateMaintenanceRequestDto {
  @ApiProperty({
    example: 'uuid-of-property',
    description: 'Property UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ example: 'uuid-of-unit', description: 'Unit UUID' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

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

  @ApiPropertyOptional({
    example: 'Tenant mentioned this started last week.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
