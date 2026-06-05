import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * CreateUnitDto — validated request body for POST /properties/:propertyId/units.
 *
 * Security rules (NON-NEGOTIABLE):
 * - tenantId MUST NOT be present — sourced from verified Clerk JWT context.
 * - propertyId MUST NOT be present — sourced from URL path parameter only.
 * - status MUST NOT be present — always defaults to AVAILABLE on creation.
 * - The global ValidationPipe (forbidNonWhitelisted: true) will reject any
 *   request body field not declared here.
 */
export class CreateUnitDto {
  @ApiProperty({
    example: '101',
    maxLength: 50,
    description:
      'Identifier for this unit within the property (e.g. "101", "A", "Penthouse"). Must be unique within the property.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitNumber!: string;

  @ApiPropertyOptional({
    example: 85.5,
    description:
      'Floor area in the landlord\'s preferred unit system. Must be positive if provided.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  floorArea?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of bedrooms. Must be at least 1 if provided.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  bedrooms?: number;

  @ApiPropertyOptional({
    example: 1.5,
    description:
      'Number of bathrooms. Fractional values (e.g. 1.5) are allowed. Must be positive if provided.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bathrooms?: number;

  @ApiPropertyOptional({
    example: 15000.0,
    description: 'Monthly rent amount. Must be positive if provided.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyRent?: number;

  @ApiPropertyOptional({
    example: 'Corner unit with garden view.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
