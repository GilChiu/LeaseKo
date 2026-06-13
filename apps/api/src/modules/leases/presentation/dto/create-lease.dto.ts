import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateLeaseDto {
  @ApiProperty({ example: 'uuid-of-property', description: 'Property UUID' })
  @IsUUID()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ example: 'uuid-of-unit', description: 'Unit UUID' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ example: 'uuid-of-tenant-contact', description: 'Tenant contact (lessee) UUID' })
  @IsUUID()
  @IsNotEmpty()
  tenantContactId!: string;

  @ApiProperty({ example: '2026-07-01', description: 'Lease start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-06-30', description: 'Lease end date (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 25000, description: 'Monthly rent amount' })
  @IsNumber()
  @IsPositive()
  monthlyRent!: number;

  @ApiPropertyOptional({ example: 50000, description: 'Security deposit amount', nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  depositAmount?: number;

  @ApiPropertyOptional({ example: 'Month-to-month with 30-day notice.', maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
