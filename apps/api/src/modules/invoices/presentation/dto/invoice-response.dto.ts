import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Invoice, InvoiceStatus } from '../../domain/entities/invoice.entity';

export class InvoiceResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'uuid-of-lease' })
  leaseId!: string;

  @ApiProperty({ example: 'uuid-of-tenant-contact' })
  tenantContactId!: string;

  @ApiProperty({ example: 'INV-202607-A3K9' })
  invoiceNumber!: string;

  @ApiProperty({ enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID'], example: 'DRAFT' })
  status!: InvoiceStatus;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  dueDate!: Date;

  @ApiProperty({ example: 25000 })
  amount!: number;

  @ApiPropertyOptional({ example: 'Monthly rent - July 2026', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: '2026-06-18T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-18T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(invoice: Invoice): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = invoice.id;
    dto.tenantId = invoice.tenantId;
    dto.leaseId = invoice.leaseId;
    dto.tenantContactId = invoice.tenantContactId;
    dto.invoiceNumber = invoice.invoiceNumber;
    dto.status = invoice.status;
    dto.dueDate = invoice.dueDate;
    dto.amount = invoice.amount;
    dto.notes = invoice.notes;
    dto.createdAt = invoice.createdAt;
    dto.updatedAt = invoice.updatedAt;
    return dto;
  }
}
