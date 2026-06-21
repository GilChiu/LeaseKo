import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-invoice' })
  invoiceId!: string;

  @ApiProperty({ example: 25000 })
  amount!: number;

  @ApiProperty({
    enum: ['CASH', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'CHECK', 'OTHER'],
    example: 'BANK_TRANSFER',
  })
  method!: PaymentMethod;

  @ApiProperty({
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    example: 'COMPLETED',
  })
  status!: PaymentStatus;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z' })
  recordedAt!: Date;

  @ApiPropertyOptional({ example: 'July rent payment', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.tenantId = payment.tenantId;
    dto.invoiceId = payment.invoiceId;
    dto.amount = payment.amount;
    dto.method = payment.method;
    dto.status = payment.status;
    dto.recordedAt = payment.recordedAt;
    dto.notes = payment.notes;
    dto.createdAt = payment.createdAt;
    dto.updatedAt = payment.updatedAt;
    return dto;
  }
}
