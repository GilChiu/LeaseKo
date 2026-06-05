import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * UpdatePropertyDto — validated request body for PATCH /properties/:id.
 *
 * Security rules (NON-NEGOTIABLE):
 * - tenantId MUST NOT be present in this DTO.
 * - tenantId is sourced from verified Clerk JWT context in the controller.
 * - The global ValidationPipe (forbidNonWhitelisted: true) will reject any
 *   request body field not declared here, including tenantId.
 * - Empty body rejection is enforced by the controller before the use case is called.
 */
export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Sunset Apartments', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '123 Main Street', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Unit A', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Iloilo City', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'Iloilo', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @ApiPropertyOptional({ example: '5000', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Philippines', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @ApiPropertyOptional({
    example: 'APARTMENT',
    description: 'Type of property (free-form string)',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  propertyType?: string;

  @ApiPropertyOptional({ example: 'A 12-unit apartment building.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
