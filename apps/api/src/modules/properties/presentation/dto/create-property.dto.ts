import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * CreatePropertyDto — validated request body for POST /properties.
 *
 * Security rules (NON-NEGOTIABLE):
 * - tenantId MUST NOT be present in this DTO.
 * - tenantId is sourced from verified Clerk JWT context in the controller.
 * - The global ValidationPipe (forbidNonWhitelisted: true) will reject any
 *   request body field not declared here.
 */
export class CreatePropertyDto {
  @ApiProperty({ example: 'Sunset Apartments', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '123 Main Street', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Unit A', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'Iloilo City', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

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

  @ApiProperty({ example: 'Philippines', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  country!: string;

  @ApiProperty({
    example: 'APARTMENT',
    description: 'Type of property (free-form string at this stage)',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  propertyType!: string;

  @ApiPropertyOptional({ example: 'A 12-unit apartment building.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
