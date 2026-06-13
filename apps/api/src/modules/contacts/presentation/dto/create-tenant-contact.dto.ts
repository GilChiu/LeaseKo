import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * CreateTenantContactDto — validated request body for POST /contacts.
 *
 * Security rules (NON-NEGOTIABLE):
 * - tenantId MUST NOT be present in this DTO.
 * - tenantId is sourced from verified Clerk JWT context in the controller.
 * - The global ValidationPipe (whitelist: true) strips any extra fields not declared here.
 */
export class CreateTenantContactDto {
  @ApiProperty({ example: 'Alice', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Smith', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'alice@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+63 912 345 6789', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'P-12345678A', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idNumber?: string;

  @ApiPropertyOptional({ example: 'Prefers move-in after August.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
