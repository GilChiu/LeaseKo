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

export class CreateInvoiceDto {
  @ApiProperty({ example: 'uuid-of-lease', description: 'Lease UUID' })
  @IsUUID()
  @IsNotEmpty()
  leaseId!: string;

  @ApiProperty({ example: '2026-07-01', description: 'Invoice due date (ISO 8601)' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 25000, description: 'Invoice amount' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Monthly rent - July 2026', maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
