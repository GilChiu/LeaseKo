import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

const PAYMENT_METHOD_VALUES: PaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'GCASH',
  'MAYA',
  'CHECK',
  'OTHER',
];
const PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
];

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number (1-indexed)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filter by invoice ID' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({
    enum: PAYMENT_METHOD_VALUES,
    description: 'Filter by payment method',
  })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES)
  method?: PaymentMethod;

  @ApiPropertyOptional({
    enum: PAYMENT_STATUS_VALUES,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES)
  status?: PaymentStatus;
}
