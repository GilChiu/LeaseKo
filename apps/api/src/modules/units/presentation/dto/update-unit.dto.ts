import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { UnitStatus } from '../../domain/entities/unit.entity';

/**
 * UpdateUnitDto — validated request body for PATCH /units/:id.
 *
 * Security rules (NON-NEGOTIABLE):
 * - id, tenantId, propertyId MUST NOT be present — sourced from path/JWT context.
 * - The global ValidationPipe (forbidNonWhitelisted: true) rejects any extra fields.
 *
 * Null semantics:
 * - undefined (field omitted) → no change
 * - null (field explicitly set) → clear the stored value
 * - @ValidateIf(o => o.field !== null) allows null to bypass type validators while
 *   still rejecting invalid non-null values.
 */
export class UpdateUnitDto {
  @ApiPropertyOptional({
    example: '101',
    maxLength: 50,
    description: 'New unit identifier within the property. Must be unique within the property.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitNumber?: string;

  @ApiPropertyOptional({
    example: 85.5,
    nullable: true,
    description: 'Floor area. Pass null to clear. Must be positive if provided.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.floorArea !== null)
  @IsNumber()
  @IsPositive()
  floorArea?: number | null;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description: 'Number of bedrooms. Pass null to clear. Must be at least 1 if provided.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.bedrooms !== null)
  @IsInt()
  @Min(1)
  bedrooms?: number | null;

  @ApiPropertyOptional({
    example: 1.5,
    nullable: true,
    description: 'Number of bathrooms. Pass null to clear. Must be positive if provided.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.bathrooms !== null)
  @IsNumber()
  @IsPositive()
  bathrooms?: number | null;

  @ApiPropertyOptional({
    example: 15000.0,
    nullable: true,
    description: 'Monthly rent. Pass null to clear. Must be positive if provided.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.monthlyRent !== null)
  @IsNumber()
  @IsPositive()
  monthlyRent?: number | null;

  @ApiPropertyOptional({
    example: 'Corner unit with garden view.',
    nullable: true,
    maxLength: 1000,
    description: 'Unit description. Pass null to clear.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.description !== null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'OCCUPIED',
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'],
    description:
      'Unit lifecycle status. Transitions are enforced: AVAILABLE→{OCCUPIED,MAINTENANCE,INACTIVE}, OCCUPIED→{AVAILABLE,MAINTENANCE}, MAINTENANCE→{AVAILABLE,INACTIVE}, INACTIVE→{} (terminal). Invalid transitions return 422.',
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'] satisfies UnitStatus[])
  status?: UnitStatus;
}
