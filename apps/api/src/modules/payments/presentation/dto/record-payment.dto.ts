import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../domain/entities/payment.entity';

const PAYMENT_METHOD_VALUES: PaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'GCASH',
  'MAYA',
  'CHECK',
  'OTHER',
];

export class RecordPaymentDto {
  @ApiProperty({ example: 'uuid-of-invoice', description: 'Invoice UUID' })
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @ApiProperty({ example: 25000, description: 'Payment amount' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    enum: PAYMENT_METHOD_VALUES,
    example: 'BANK_TRANSFER',
    description: 'Payment method',
  })
  @IsIn(PAYMENT_METHOD_VALUES)
  method!: PaymentMethod;

  @ApiProperty({
    example: '2026-07-15',
    description: 'Date payment was recorded (ISO 8601)',
  })
  @IsDateString()
  recordedAt!: string;

  @ApiPropertyOptional({
    example: 'July rent payment',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
