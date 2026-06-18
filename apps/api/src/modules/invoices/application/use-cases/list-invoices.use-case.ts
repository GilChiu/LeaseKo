import { Inject, Injectable } from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import { InvoiceStatus } from '../../domain/entities/invoice.entity';
import { PagedInvoices } from '../types/invoice-repository.types';

export interface ListInvoicesUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: InvoiceStatus;
}

@Injectable()
export class ListInvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(input: ListInvoicesUseCaseInput): Promise<PagedInvoices> {
    return this.invoices.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
      status: input.status,
    });
  }
}
