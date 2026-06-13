import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * UpdateTenantContactDto — validated request body for PATCH /contacts/:id.
 *
 * All fields are optional individually — but the use case enforces that at
 * least one field is present. The global ValidationPipe (whitelist: true)
 * strips any extra fields including tenantId.
 */
export class UpdateTenantContactDto {
  @ApiPropertyOptional({ example: 'Alice', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'alice@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+63 912 345 6789', maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'P-12345678A', maxLength: 50, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idNumber?: string | null;

  @ApiPropertyOptional({ example: 'Updated notes.', maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
