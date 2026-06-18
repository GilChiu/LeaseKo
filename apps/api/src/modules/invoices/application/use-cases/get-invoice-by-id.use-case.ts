import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import { Invoice } from '../../domain/entities/invoice.entity';

export interface GetInvoiceByIdUseCaseInput {
  id: string;
  tenantId: string;
}

@Injectable()
export class GetInvoiceByIdUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(input: GetInvoiceByIdUseCaseInput): Promise<Invoice> {
    const invoice = await this.invoices.findById(input.id, input.tenantId);

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    return invoice;
  }
}
